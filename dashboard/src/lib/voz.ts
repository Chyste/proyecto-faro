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
  fd.append('audio', audio, audio.type.includes('ogg') ? 'voz.ogg' : 'voz.webm');
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

/** Sequential speech queue: one utterance at a time; Fish when `usarFish()` is true, else the browser voice. */
export class ColaVoz {
  private cola: string[] = [];
  private activo = false;
  private audio: HTMLAudioElement | null = null;
  private cancelado = 0;
  constructor(private usarFish: () => boolean, private onEstado: (hablando: boolean) => void, private onFallo: (m: string) => void) {}

  decir(texto: string): void {
    this.cola.push(texto);
    void this.bombear();
  }

  detener(): void {
    this.cancelado++;
    this.cola = [];
    this.audio?.pause();
    this.audio = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.activo = false;
    this.onEstado(false);
  }

  private async bombear(): Promise<void> {
    if (this.activo) return;
    this.activo = true;
    this.onEstado(true);
    const ciclo = this.cancelado;
    while (this.cola.length && ciclo === this.cancelado) {
      const t = this.cola.shift() as string;
      let ok = false;
      if (this.usarFish()) {
        try { await this.reproducir(await ttsFish(t), ciclo); ok = true; } catch { this.onFallo('Voz de Fish no disponible; se usa la voz del navegador'); }
      }
      if (!ok && ciclo === this.cancelado) await speakBrowser(t);
    }
    if (ciclo === this.cancelado) { this.activo = false; this.onEstado(false); }
  }

  private reproducir(blob: Blob, ciclo: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      this.audio = a;
      const fin = () => { URL.revokeObjectURL(url); resolve(); };
      a.onended = fin;
      a.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio')); };
      if (ciclo !== this.cancelado) return fin();
      a.play().catch((e) => { URL.revokeObjectURL(url); reject(e); });
    });
  }
}

/** Push-to-talk recorder (MediaRecorder). stop() resolves with the audio blob. */
export class Grabadora {
  private rec: MediaRecorder | null = null;
  private trozos: Blob[] = [];
  private stream: MediaStream | null = null;

  static disponible(): boolean { return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'; }

  async iniciar(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.trozos = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.trozos.push(e.data); };
    this.rec.start();
  }

  detener(): Promise<Blob> {
    return new Promise((resolve) => {
      const rec = this.rec;
      if (!rec) return resolve(new Blob());
      rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.trozos, { type: rec.mimeType || 'audio/webm' }));
      };
      rec.stop();
    });
  }
}

// ---- Web Speech API recognition (fallback when Fish STT is unavailable)
type SR = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void };
export function reconocimientoNavegador(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export function escucharNavegador(): { parar: () => void; texto: Promise<string> } | null {
  const C = reconocimientoNavegador();
  if (!C) return null;
  const r = new C();
  r.lang = 'es-CL';
  r.interimResults = false;
  let out = '';
  const texto = new Promise<string>((resolve) => {
    r.onresult = (e) => { out = Array.from(e.results).map((x) => x[0].transcript).join(' '); };
    r.onerror = () => resolve(out);
    r.onend = () => resolve(out);
  });
  r.start();
  return { parar: () => r.stop(), texto };
}
