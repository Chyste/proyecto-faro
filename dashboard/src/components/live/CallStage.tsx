import { useEffect, useRef } from 'react';
import { initials } from './liveModel';
import type { EstadoLlamada } from '../../lib/llamada';

export interface Niveles { mic: number; ia: number }
const BARS = 21;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Two avatars with rings that pulse with the real audio level of whoever is talking, plus live waveform bars. */
export default function CallStage({ nombre, estado, getNiveles }: { nombre: string; estado: EstadoLlamada; getNiveles: () => Niveles }) {
  const ringIa = useRef<HTMLSpanElement>(null);
  const ringMe = useRef<HTMLSpanElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const lv = useRef({ ia: 0, mic: 0 });

  useEffect(() => {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    const loop = () => {
      const n = getNiveles();
      const L = lv.current;
      L.ia = L.ia * 0.6 + clamp(n.ia * 7) * 0.4;
      L.mic = L.mic * 0.6 + clamp(n.mic * 7) * 0.4;
      const paint = (el: HTMLElement | null, v: number) => {
        if (!el) return;
        el.style.opacity = String(0.15 + v * 0.7);
        el.style.transform = reducido ? 'none' : `scale(${1 + v * 0.55})`;
      };
      paint(ringIa.current, L.ia);
      paint(ringMe.current, L.mic);
      const v = estado === 'hablando' ? L.ia : estado === 'escuchando' ? L.mic : 0;
      const t = performance.now() / 140;
      bars.current.forEach((b, i) => {
        if (!b) return;
        const shape = 0.45 + 0.55 * Math.abs(Math.sin(t + i * 0.7)) * (1 - Math.abs(i - BARS / 2) / (BARS / 1.6));
        b.style.transform = reducido ? `scaleY(${0.15 + v * 0.85})` : `scaleY(${0.12 + v * shape * 0.88})`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getNiveles, estado]);

  const conectada = estado !== 'inactiva' && estado !== 'finalizada';
  return (
    <div className={`ev-stage ${conectada ? 'ev-stage-on' : ''}`} aria-hidden>
      <div className={`ev-party ${estado === 'hablando' ? 'ev-party-talk' : ''}`}>
        <span className="ev-ring" ref={ringIa} />
        <div className="ev-avatar ev-avatar-stage ev-avatar-faro">FARO</div>
        <small>Asistente</small>
      </div>
      <div className="ev-bars">
        {Array.from({ length: BARS }, (_, i) => <i key={i} ref={(el) => { bars.current[i] = el; }} />)}
      </div>
      <div className={`ev-party ${estado === 'escuchando' ? 'ev-party-talk' : ''}`}>
        <span className="ev-ring" ref={ringMe} />
        <div className="ev-avatar ev-avatar-stage">{initials(nombre || 'P')}</div>
        <small>{nombre || 'Persona'}</small>
      </div>
    </div>
  );
}
