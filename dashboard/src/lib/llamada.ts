// Hands-free phone-call controller: one mic stream for the whole call, VAD-driven turn-taking,
// barge-in, tones, and speech-recognition fallback. UI-agnostic: talks to React through `Hooks`.
import { ColaVoz, reconocimientoNavegador, rmsDe, sttFish, type SR } from './voz';
import { VAD_BARGE_IN, VAD_TURNO, vadInit, vadStep, type VadCfg, type VadEvent, type VadState } from './vad';

export type EstadoLlamada = 'inactiva' | 'llamando' | 'en_llamada' | 'hablando' | 'escuchando' | 'pensando' | 'finalizada';

export interface Hooks {
  onEstado: (e: EstadoLlamada) => void;
  onParcial: (texto: string) => void;       // live caption ("…" while transcribing)
  onSigueAhi: (visible: boolean) => void;   // "¿Sigue ahí?" hint
  onSinRespuesta: (visible: boolean) => void; // gave up listening -> show «Repetir pregunta»
  onAviso: (m: string) => void;
  enviar: (texto: string) => Promise<void>; // POST /respuesta
}
export interface Opciones { ttsFish: () => boolean; sttFish: () => boolean }

/** Tunables (ms) that live outside the pure VAD config. */
export const NAV_SILENCIO_MS = 1200;   // browser-recognition end-of-turn silence
export const SIN_RESPUESTA_SEGURIDAD_MS = 6000; // POST done but nothing was said back -> listen again
export const MIN_BLOB_BYTES = 1500;

type Tono = [freq: number, inicioS: number, durS: number];

function sonar(ctx: AudioContext, notas: Tono[], vol: number): void {
  const t0 = ctx.currentTime + 0.02;
  for (const [f, ini, dur] of notas) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + ini);
    g.gain.exponentialRampToValueAtTime(vol, t0 + ini + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0 + ini); o.stop(t0 + ini + dur + 0.05);
  }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function mimeGrabacion(): string | undefined {
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return c.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
}

export class Llamada {
  readonly cola: ColaVoz;
  private hooks: Hooks;
  private opts: Opciones;
  private estado: EstadoLlamada = 'inactiva';
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private micAn: AnalyserNode | null = null;
  private micBuf: Float32Array<ArrayBuffer> | null = null;
  private muted = false;
  private modo: 'fish' | 'nav' | 'ninguno' = 'ninguno';
  private lista: Promise<void> = Promise.resolve();
  private tick: ReturnType<typeof setInterval> | null = null;
  private ultimoTick = 0;
  private vad: VadState = vadInit();
  private vadCfg: VadCfg = VAD_TURNO;
  private rec: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private turno = 0;              // invalidates async work from old turns / after hang-up
  private cierrePendiente = false;
  private tEscucha: ReturnType<typeof setTimeout> | null = null;
  private tSeguridad: ReturnType<typeof setTimeout> | null = null;
  // browser recognition
  private nav: SR | null = null;
  private navPrevio = '';
  private navActual = '';
  private tNavSilencio: ReturnType<typeof setTimeout> | null = null;
  private tNavNudge: ReturnType<typeof setTimeout> | null = null;
  private tNavGiveUp: ReturnType<typeof setTimeout> | null = null;

  constructor(hooks: Hooks, opts: Opciones) {
    this.hooks = hooks; this.opts = opts;
    this.cola = new ColaVoz(opts.ttsFish, (h) => this.alCambiarCola(h), (m) => hooks.onAviso(m));
  }

  get fase(): EstadoLlamada { return this.estado; }
  get activa(): boolean { return this.estado !== 'inactiva' && this.estado !== 'finalizada'; }
  get silenciada(): boolean { return this.muted; }
  get hayMicrofono(): boolean { return this.modo !== 'ninguno'; }

  /** Live levels 0..1 for the UI (read from rAF). */
  nivelMic(): number { return this.muted || !this.micAn || !this.micBuf ? 0 : rmsDe(this.micAn, this.micBuf); }
  nivelIa(): number { return this.cola.nivel(); }

  /** Speak an assistant utterance once the call is connected. */
  decir(texto: string): void { void this.lista.then(() => { if (this.activa) this.cola.decir(texto); }); }

  /** Start the call: connect tone + mic permission in parallel. Must be called from a click. */
  async iniciar(): Promise<void> {
    this.reset();
    this.setEstado('llamando');
    const mi = ++this.turno;
    let listo!: () => void;
    this.lista = new Promise<void>((r) => { listo = r; });
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      await this.ctx.resume().catch(() => undefined);
      this.cola.conectar(this.ctx);
      sonar(this.ctx, [[440, 0, 0.22], [440, 0.34, 0.22]], 0.08);
      await Promise.all([esperar(750), this.abrirMic()]);
    } finally {
      if (mi === this.turno && this.estado === 'llamando') this.setEstado('en_llamada');
      listo();
    }
    if (mi !== this.turno) return;
    this.modo = this.stream && typeof MediaRecorder !== 'undefined' && this.opts.sttFish() ? 'fish' : reconocimientoNavegador() ? 'nav' : 'ninguno';
    if (this.modo === 'ninguno') this.hooks.onAviso('Este navegador no permite hablar por micrófono; escriba la respuesta');
    this.tick = setInterval(() => this.alTick(), 50);
    this.ultimoTick = Date.now();
  }

  /** Hang up (anytime). Safe to call twice. */
  colgar(): void {
    if (this.estado === 'finalizada' || this.estado === 'inactiva') return;
    this.turno++;
    this.limpiarTemporizadores();
    this.cortarCaptura();
    this.cola.detener(true);
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.micAn = null;
    const ctx = this.ctx;
    if (ctx) { try { sonar(ctx, [[480, 0, 0.16], [350, 0.2, 0.3]], 0.05); } catch { /* tone is cosmetic */ } setTimeout(() => void ctx.close().catch(() => undefined), 900); }
    this.ctx = null;
    this.hooks.onParcial(''); this.hooks.onSigueAhi(false); this.hooks.onSinRespuesta(false);
    this.setEstado('finalizada');
  }

  /** Call ended by the backend (terminada / urgente): finish the last utterance, then hang up. */
  cerrarTrasHablar(): void {
    this.cierrePendiente = true;
    setTimeout(() => { if (this.cierrePendiente && !this.cola.hablando) this.colgar(); }, 1200);
  }

  silenciar(m: boolean): void {
    this.muted = m;
    this.stream?.getAudioTracks().forEach((t) => { t.enabled = !m; });
    if (m) { this.abortarNav(); } else if (this.estado === 'escuchando' && this.modo === 'nav') this.iniciarNav();
  }

  /** «Repetir pregunta» after giving up: say it again, then listen. */
  repetir(texto: string): void {
    this.hooks.onSinRespuesta(false); this.hooks.onSigueAhi(false);
    if (!this.activa) return;
    if (texto) this.cola.decir(texto); else this.iniciarEscucha();
  }

  // ---------------------------------------------------------------- internals
  private reset(): void {
    this.turno++;
    this.limpiarTemporizadores();
    this.cortarCaptura();
    this.cola.detener(true);
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.micAn = null; this.muted = false; this.cierrePendiente = false;
    if (this.ctx) { void this.ctx.close().catch(() => undefined); this.ctx = null; }
    this.hooks.onParcial(''); this.hooks.onSigueAhi(false); this.hooks.onSinRespuesta(false);
    this.estado = 'inactiva';
  }

  private setEstado(e: EstadoLlamada): void {
    if (this.estado === e) return;
    this.estado = e; this.hooks.onEstado(e);
  }

  private async abrirMic(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || !this.ctx) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const an = this.ctx.createAnalyser();
      an.fftSize = 2048;
      this.ctx.createMediaStreamSource(this.stream).connect(an); // not connected to destination: no self-echo
      this.micAn = an; this.micBuf = new Float32Array(new ArrayBuffer(an.fftSize * 4));
    } catch {
      this.stream = null; this.micAn = null;
      this.hooks.onAviso('No hay permiso para usar el micrófono; escriba la respuesta');
    }
  }

  private alCambiarCola(hablando: boolean): void {
    if (!this.activa) return;
    if (hablando) {
      this.limpiarTemporizadores();
      if (this.estado === 'escuchando') this.cortarCaptura();
      this.hooks.onSigueAhi(false); this.hooks.onSinRespuesta(false); this.hooks.onParcial('');
      this.vad = vadInit(); this.vadCfg = VAD_BARGE_IN;
      this.setEstado('hablando');
      return;
    }
    if (this.cierrePendiente) { const mi = this.turno; setTimeout(() => { if (mi === this.turno) this.colgar(); }, 450); return; }
    const mi = this.turno;
    this.tEscucha = setTimeout(() => {
      if (mi === this.turno && !this.cola.hablando && (this.estado === 'hablando' || this.estado === 'en_llamada')) this.iniciarEscucha();
    }, 250);
  }

  private alTick(): void {
    const ahora = Date.now();
    const dt = Math.min(ahora - this.ultimoTick, 200); this.ultimoTick = ahora;
    if (this.modo === 'ninguno' || !this.micAn || !this.micBuf) return;
    const hablandoIa = this.estado === 'hablando' && this.cola.hablando && !this.cola.esNavegador;
    const escuchando = this.estado === 'escuchando' && this.modo === 'fish';
    if (!hablandoIa && !escuchando) return;
    const rms = this.muted ? 0 : rmsDe(this.micAn, this.micBuf);
    const r = vadStep(this.vad, rms, this.vadCfg, dt);
    this.vad = r.state;
    for (const ev of r.events) this.alEventoVad(ev, hablandoIa);
  }

  private alEventoVad(ev: VadEvent, barge: boolean): void {
    if (barge) { if (ev === 'speech_start') { this.cola.detener(true); this.iniciarEscucha(); } return; }
    if (ev === 'nudge') this.hooks.onSigueAhi(true);
    else if (ev === 'give_up') this.rendirse();
    else if (ev === 'speech_end' || ev === 'max_turn') void this.finalizarTurno();
    else if (ev === 'speech_start') this.hooks.onSigueAhi(false);
  }

  private iniciarEscucha(): void {
    if (!this.activa || this.modo === 'ninguno' || this.cierrePendiente) return;
    this.limpiarTemporizadores();
    this.cortarCaptura();
    this.hooks.onParcial(''); this.hooks.onSigueAhi(false); this.hooks.onSinRespuesta(false);
    this.vad = vadInit(); this.vadCfg = VAD_TURNO;
    this.setEstado('escuchando');
    if (this.modo === 'fish' && this.stream) {
      try {
        const mime = mimeGrabacion();
        const rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
        this.trozos = [];
        rec.ondataavailable = (e) => { if (e.data.size) this.trozos.push(e.data); };
        rec.start(250);
        this.rec = rec;
      } catch { this.hooks.onAviso('No se pudo grabar el audio; escriba la respuesta'); }
    } else if (this.modo === 'nav') {
      this.navPrevio = ''; this.navActual = '';
      this.tNavNudge = setTimeout(() => this.hooks.onSigueAhi(true), VAD_TURNO.nudgeMs);
      this.tNavGiveUp = setTimeout(() => this.rendirse(), VAD_TURNO.giveUpMs);
      if (!this.muted) this.iniciarNav();
    }
  }

  private rendirse(): void {
    this.cortarCaptura(); this.limpiarTemporizadores();
    this.hooks.onSigueAhi(false); this.hooks.onSinRespuesta(true);
    this.setEstado('en_llamada');
  }

  /** End of a turn in Fish-STT mode: stop recorder -> STT -> POST. */
  private async finalizarTurno(): Promise<void> {
    const mi = ++this.turno;
    this.setEstado('pensando'); this.hooks.onParcial('…'); this.hooks.onSigueAhi(false);
    const blob = await this.detenerGrabadora();
    if (mi !== this.turno) return;
    if (blob.size < MIN_BLOB_BYTES) { this.iniciarEscucha(); return; }
    let texto = '';
    try { texto = (await sttFish(blob)).trim(); } catch { this.hooks.onAviso('No se pudo transcribir el audio; intente de nuevo o escriba'); }
    if (mi !== this.turno) return;
    await this.enviarTexto(texto, mi);
  }

  private async enviarTexto(texto: string, mi: number): Promise<void> {
    if (!texto) { this.iniciarEscucha(); return; }
    this.hooks.onParcial(texto);
    try { await this.hooks.enviar(texto); } catch { this.hooks.onAviso('No se pudo enviar la respuesta'); if (mi === this.turno) this.iniciarEscucha(); return; }
    if (mi !== this.turno) return;
    this.hooks.onParcial('');
    // If the backend says nothing back (no decir, no fin), do not hang in "Pensando…".
    this.tSeguridad = setTimeout(() => { if (mi === this.turno && this.estado === 'pensando' && !this.cola.hablando && !this.cierrePendiente) this.iniciarEscucha(); }, SIN_RESPUESTA_SEGURIDAD_MS);
  }

  private detenerGrabadora(): Promise<Blob> {
    return new Promise((resolve) => {
      const rec = this.rec; this.rec = null;
      if (!rec || rec.state === 'inactive') return resolve(new Blob());
      rec.onstop = () => resolve(new Blob(this.trozos, { type: rec.mimeType || 'audio/webm' }));
      try { rec.stop(); } catch { resolve(new Blob()); }
    });
  }

  /** Drop any in-flight capture without using it. */
  private cortarCaptura(): void {
    const rec = this.rec; this.rec = null;
    if (rec && rec.state !== 'inactive') { rec.ondataavailable = null; rec.onstop = null; try { rec.stop(); } catch { /* already stopped */ } }
    this.trozos = [];
    this.abortarNav();
  }

  private limpiarTemporizadores(): void {
    for (const t of [this.tEscucha, this.tSeguridad, this.tNavSilencio, this.tNavNudge, this.tNavGiveUp]) if (t) clearTimeout(t);
    this.tEscucha = this.tSeguridad = this.tNavSilencio = this.tNavNudge = this.tNavGiveUp = null;
  }

  // ------------------------------------------------ browser SpeechRecognition (es-CL, continuous)
  private iniciarNav(): void {
    const C = reconocimientoNavegador();
    if (!C || this.nav) return;
    const r = new C();
    r.lang = 'es-CL'; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      this.navActual = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim();
      const visto = `${this.navPrevio} ${this.navActual}`.trim();
      if (!visto) return;
      this.hooks.onParcial(visto); this.hooks.onSigueAhi(false);
      if (this.tNavNudge) clearTimeout(this.tNavNudge);
      if (this.tNavGiveUp) clearTimeout(this.tNavGiveUp);
      this.tNavNudge = this.tNavGiveUp = null;
      if (this.tNavSilencio) clearTimeout(this.tNavSilencio);
      const mi = this.turno;
      this.tNavSilencio = setTimeout(() => { if (mi === this.turno) void this.finalizarNav(); }, NAV_SILENCIO_MS);
    };
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.hooks.onAviso('Sin permiso de reconocimiento de voz; escriba la respuesta'); };
    r.onend = () => {
      if (this.nav !== r) return;
      this.nav = null;
      this.navPrevio = `${this.navPrevio} ${this.navActual}`.trim(); this.navActual = '';
      if (this.estado === 'escuchando' && !this.muted) setTimeout(() => { if (this.estado === 'escuchando') this.iniciarNav(); }, 150);
    };
    this.nav = r;
    try { r.start(); } catch { this.nav = null; }
  }

  private abortarNav(): void {
    const r = this.nav; this.nav = null;
    if (r) { r.onresult = null; r.onend = null; r.onerror = null; try { r.abort(); } catch { /* not started */ } }
    if (this.tNavSilencio) { clearTimeout(this.tNavSilencio); this.tNavSilencio = null; }
  }

  private async finalizarNav(): Promise<void> {
    const mi = ++this.turno;
    const texto = `${this.navPrevio} ${this.navActual}`.trim();
    this.abortarNav(); this.limpiarTemporizadores();
    this.setEstado('pensando');
    await this.enviarTexto(texto, mi);
  }
}
