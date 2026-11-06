// Voice helpers for the live call. Fish Audio is proxied by the API (keys never reach the browser);
// without it we fall back to the browser's speechSynthesis / Web Speech recognition, else typing.
import { API_BASE } from './liveApi';

export interface VozEstado { tts: boolean; stt: boolean }

export async function getVozEstado(): Promise<VozEstado> {
  try {
    const r = await fetch(`${API_BASE}/api/voz/estado`);
    return r.ok ? ((await r.json()) as VozEstado) : { tts: false, stt: false };
  } catch {
    return { tts: false, stt: false };
  }
}

async function ttsFish(texto: string): Promise<Blob> {
  const r = await fetch(`${API_BASE}/api/voz/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
  if (!r.ok) throw new Error(`tts ${r.status}`);
  return r.blob();
}

export async function sttFish(audio: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('audio', audio, audio.type.includes('ogg') ? 'voz.ogg' : audio.type.includes('mp4') ? 'voz.mp4' : 'voz.webm');
  const r = await fetch(`${API_BASE}/api/voz/stt`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`stt ${r.status}`);
  return ((await r.json()) as { texto: string }).texto;
}

function speakBrowser(texto: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') return resolve();
    const u = new SpeechSynthesisUtterance(texto);
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === 'es-CL') ?? voices.find((x) => x.lang.startsWith('es'));
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'es-CL';
    u.rate = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

/** RMS (0..1) of the current time-domain frame of an analyser. */
export function rmsDe(an: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
  an.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

interface Item { texto: string; blob: Promise<Blob | null> }

/** Sequential speech queue. TTS for every queued utterance is fetched in parallel (prefetch) and played in order
 *  through one <audio> element wired to an AnalyserNode, so the UI can show the assistant's real level. */
export class ColaVoz {
  private cola: Item[] = [];
  private activo = false;
  private el: HTMLAudioElement | null = null;
  private analizador: AnalyserNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private cancelado = 0;
  private soltarActual: (() => void) | null = null;
  private navegadorHablando = false;
  private usarFish: () => boolean;
  private onEstado: (hablando: boolean) => void;
  private onFallo: (m: string) => void;
  constructor(usarFish: () => boolean, onEstado: (hablando: boolean) => void, onFallo: (m: string) => void) {
    this.usarFish = usarFish; this.onEstado = onEstado; this.onFallo = onFallo;
  }

  get hablando(): boolean { return this.activo; }
  /** True while speaking with the browser voice (no real level, echo is not cancelled). */
  get esNavegador(): boolean { return this.navegadorHablando; }

  /** Route the audio element through an analyser (call once, from a user gesture). */
  conectar(ctx: AudioContext): void {
    if (this.analizador) return;
    try {
      const src = ctx.createMediaElementSource(this.elemento());
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an); an.connect(ctx.destination);
      this.analizador = an; this.buf = new Float32Array(new ArrayBuffer(an.fftSize * 4));
    } catch { this.analizador = null; }
  }

  /** Output level 0..1: analyser RMS for Fish audio; a soft synthetic wobble for browser speech. */
  nivel(): number {
    if (!this.activo) return 0;
    if (this.navegadorHablando) return 0.06 + 0.05 * Math.abs(Math.sin(Date.now() / 120));
    if (this.analizador && this.buf) return rmsDe(this.analizador, this.buf);
    return 0;
  }

  decir(texto: string): void {
    const blob = this.usarFish()
      ? ttsFish(texto).catch(() => { this.onFallo('Voz de Fish no disponible; se usa la voz del navegador'); return null; })
      : Promise.resolve(null);
    this.cola.push({ texto, blob });
    void this.bombear();
  }

  /** Stop everything. `silencioso` skips onEstado(false) (the caller handles the transition). */
  detener(silencioso = false): void {
    this.cancelado++;
    this.cola = [];
    if (this.el) { this.el.pause(); this.el.removeAttribute('src'); }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.navegadorHablando = false;
    const soltar = this.soltarActual; this.soltarActual = null; soltar?.();
    const estabaActivo = this.activo;
    this.activo = false;
    if (estabaActivo && !silencioso) this.onEstado(false);
  }

  private elemento(): HTMLAudioElement {
    if (!this.el) { this.el = new Audio(); this.el.preload = 'auto'; }
    return this.el;
  }

  private async bombear(): Promise<void> {
    if (this.activo) return;
    this.activo = true;
    this.onEstado(true);
    const ciclo = this.cancelado;
    while (this.cola.length && ciclo === this.cancelado) {
      const it = this.cola.shift() as Item;
      const blob = await it.blob;
      if (ciclo !== this.cancelado) return;
      let ok = false;
      if (blob) {
        try { await this.reproducir(blob, ciclo); ok = true; } catch { this.onFallo('No se pudo reproducir el audio; se usa la voz del navegador'); }
      }
      if (!ok && ciclo === this.cancelado) {
        this.navegadorHablando = true;
        await speakBrowser(it.texto);
        if (ciclo === this.cancelado) this.navegadorHablando = false;
      }
    }
    if (ciclo === this.cancelado) { this.activo = false; this.onEstado(false); }
  }

  private reproducir(blob: Blob, ciclo: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const a = this.elemento();
      const limpiar = () => { a.onended = null; a.onerror = null; this.soltarActual = null; URL.revokeObjectURL(url); };
      this.soltarActual = () => { limpiar(); resolve(); };
      a.onended = () => { limpiar(); resolve(); };
      a.onerror = () => { limpiar(); reject(new Error('audio')); };
      if (ciclo !== this.cancelado) { limpiar(); return resolve(); }
      a.src = url;
      a.play().catch((e) => { limpiar(); reject(e); });
    });
  }
}

// ---- Web Speech API recognition (fallback when Fish STT is unavailable)
interface SRResultado { isFinal: boolean; 0: { transcript: string } }
export interface SR {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<SRResultado> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
export function reconocimientoNavegador(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
