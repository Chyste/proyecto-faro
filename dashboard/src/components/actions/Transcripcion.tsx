import { useState } from 'react';
import type { Control, Persona, Senal } from '../../data/types';
import LevelBadge from '../ui/LevelBadge';
import { fechaCorta, NIVEL_TO_LEVEL, SEVERIDAD_TO_LEVEL } from '../../lib/faro';

const quoteOf = (s: Senal) => s.descripcion.slice(s.descripcion.indexOf(': ') + 2).trim();

export const llamadaLabel = (c: Control) => `Llamada automática · ${fechaCorta(c.fecha)} 10:00`;

/** Source is "regla" only on the urgent rule route; otherwise the AI recognized the indicator. */
const fuenteDe = (c: Control, s: Senal) => (c.nivelResultante === 'urgente' && s.severidad === 'alta' ? 'Regla' : 'IA');

function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const low = text.toLowerCase();
  const hit = quotes.map((q) => ({ q, i: low.indexOf(q.toLowerCase()) })).find((x) => x.q.length > 3 && x.i >= 0);
  if (!hit) return <>«{text}»</>;
  return (
    <>
      «{text.slice(0, hit.i)}
      <mark className="rounded bg-l1-bg px-0.5 text-ink">{text.slice(hit.i, hit.i + hit.q.length)}</mark>
      {text.slice(hit.i + hit.q.length)}»
    </>
  );
}

/** Turns of an automatic call: assistant question, person answer, evidence and recognized indicators. */
export default function Transcripcion({ persona }: { persona: Persona }) {
  const controles = [...persona.historialControles].reverse();
  const [idx, setIdx] = useState(0);
  const c = controles[idx];
  if (!c) return <p className="text-[13px] text-muted">Esta persona aún no tiene llamadas automáticas.</p>;
  const senales = persona.senales.filter((s) => s.fecha === c.fecha);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {controles.slice(0, 5).map((x, i) => (
          <button key={x.id} type="button" onClick={() => setIdx(i)} aria-pressed={i === idx}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${i === idx ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink'}`}>
            {fechaCorta(x.fecha)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-surface-soft px-3 py-2">
        <span className="text-[13px] font-medium text-ink">{llamadaLabel(c)}</span>
        <span className="text-[12px] text-muted">{c.duracion} min · {c.respuestas.length} respuestas</span>
        <LevelBadge level={NIVEL_TO_LEVEL[c.nivelResultante]} className="ml-auto" />
      </div>
      <p className="text-[13px] leading-[19px] text-body">{c.resumen}</p>
      <ol className="flex flex-col gap-3">
        {c.respuestas.map((r, i) => {
          const rel = senales.filter((s) => s.dominio === r.dominio);
          return (
            <li key={i} className="flex flex-col gap-1.5">
              <div className="max-w-[88%] self-start rounded-[14px] bg-surface-strong px-3.5 py-2.5 text-[13px] leading-[19px] text-body">
                <span className="mb-0.5 block text-[11px] font-semibold text-muted">Asistente</span>
                {r.pregunta}
              </div>
              <div className="max-w-[88%] self-end rounded-[14px] bg-ink px-3.5 py-2.5 text-[13px] leading-[19px] text-white">
                <span className="mb-0.5 block text-[11px] font-semibold opacity-70">Persona</span>
                <span className="[&_mark]:text-ink"><Highlighted text={r.respuesta} quotes={rel.map(quoteOf)} /></span>
              </div>
              <div className="flex flex-wrap gap-1.5 self-end">
                {rel.length === 0 && <span className="text-[11px] text-muted">Sin indicadores reconocidos</span>}
                {rel.map((s, k) => (
                  <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[11px] text-body">
                    <LevelBadge level={SEVERIDAD_TO_LEVEL[s.severidad]} className="!px-2 !py-0.5 !text-[10px]" />
                    {s.dominio.replace(/_/g, ' ')} · fuente {fuenteDe(c, s)}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      {senales.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-hairline-soft pt-3">
          <h3 className="text-[13px] font-semibold text-ink">Evidencia citada</h3>
          {senales.map((s, i) => (
            <p key={i} className="rounded-lg bg-surface-soft p-2.5 text-[12px] leading-[17px] text-body">«{quoteOf(s)}»</p>
          ))}
        </section>
      )}
    </>
  );
}
