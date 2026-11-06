import { useMemo, useState } from 'react';
import { getPersonas } from '../data/syntheticData';
import type { Control, Persona } from '../data/types';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import Modal from '../components/ui/Modal';
import { fechaCorta, NIVEL_TO_LEVEL } from '../lib/faro';
import { fechaHora, TIPO_LABEL, useFaro } from '../state/FaroStore';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const sel = 'rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink';

type Entry =
  | { kind: 'llamada'; key: string; ts: string; p: Persona; c: Control }
  | { kind: 'humana'; key: string; ts: string; p: Persona; tipo: string; autor: string; nota: string; detalle: string };

export default function SeguimientoPage() {
  const { state } = useFaro();
  const personas = useMemo(() => getPersonas(), []);
  const [persona, setPersona] = useState('');
  const [tipo, setTipo] = useState<'' | 'llamada' | 'humana'>('');
  const [sel1, setSel1] = useState<Entry | null>(null);

  const entries = useMemo(() => {
    const out: Entry[] = [];
    for (const p of personas) {
      for (const c of p.historialControles) out.push({ kind: 'llamada', key: `${p.id}-${c.id}`, ts: `${c.fecha}T12:00:00`, p, c });
      for (const a of state.byId[p.id]?.acciones ?? [])
        out.push({
          kind: 'humana',
          key: a.id,
          ts: a.fecha,
          p,
          tipo: TIPO_LABEL[a.tipo],
          autor: a.autor,
          nota: a.nota,
          detalle: [a.resultado, a.destino].filter(Boolean).join(' · '),
        });
    }
    return out.sort((a, b) => b.ts.localeCompare(a.ts));
  }, [personas, state]);

  const visible = entries.filter((e) => (!persona || e.p.id === persona) && (!tipo || e.kind === tipo));

  return (
    <main className="flex flex-col gap-[18px] px-8 pt-8 pb-7">
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Seguimientos</h1>
          <p className="text-[14px] text-muted">Registro cronológico de llamadas simuladas y acciones humanas · {visible.length} registros</p>
        </div>
        <DemoPill />
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="Persona">
          <option value="">Todas las personas</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
            </option>
          ))}
        </select>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as '' | 'llamada' | 'humana')} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="llamada">Llamadas simuladas</option>
          <option value="humana">Acciones humanas</option>
        </select>
      </div>

      <div className={`overflow-hidden ${card}`}>
        {visible.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">Sin registros para estos filtros.</p>}
        {visible.map((e, i) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setSel1(e)}
            className={`flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-surface-soft ${i > 0 ? 'border-t border-hairline-soft' : ''}`}
          >
            <span className="w-[110px] shrink-0 text-[13px] text-body">{e.kind === 'llamada' ? fechaCorta(e.ts.slice(0, 10)) : fechaHora(e.ts)}</span>
            <span className="w-[130px] shrink-0 text-[14px] font-semibold text-ink">{e.p.nombre}</span>
            {e.kind === 'llamada' ? (
              <>
                <span className="w-[180px] shrink-0 text-[13px] text-body">Llamada completada · {e.c.duracion} min</span>
                <div className="w-[190px] shrink-0">
                  <LevelBadge level={NIVEL_TO_LEVEL[e.c.nivelResultante]} />
                </div>
                <span className="min-w-0 flex-1 truncate text-[13px] text-body">{e.c.resumen}</span>
              </>
            ) : (
              <>
                <span className="w-[180px] shrink-0 text-[13px] font-medium text-ink">{e.tipo}</span>
                <span className="w-[190px] shrink-0 text-[12px] text-muted">{e.autor}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-body">
                  {e.detalle ? `${e.detalle} · ` : ''}
                  {e.nota}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {sel1 && (
        <Modal title={sel1.kind === 'llamada' ? `Llamada con ${sel1.p.nombre} · ${fechaCorta(sel1.c.fecha)}` : `${sel1.tipo} · ${sel1.p.nombre}`} onClose={() => setSel1(null)} wide>
          {sel1.kind === 'llamada' ? (
            <>
              <div className="flex items-center gap-3">
                <LevelBadge level={NIVEL_TO_LEVEL[sel1.c.nivelResultante]} />
                <span className="text-[12px] text-muted">
                  Llamada simulada · {sel1.c.tipo} · {sel1.c.duracion} min
                </span>
              </div>
              <p className="text-[14px] text-body">{sel1.c.resumen}</p>
              {sel1.c.respuestas.map((r, i) => (
                <div key={i} className="rounded-lg bg-surface-soft p-3">
                  <p className="text-[12px] font-medium text-muted">{r.pregunta}</p>
                  <p className="text-[13px] leading-[19px] text-body">«{r.respuesta}»</p>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">
                {sel1.autor} · {fechaHora(sel1.ts)}
              </p>
              {sel1.detalle && <p className="text-[14px] font-medium text-ink">{sel1.detalle}</p>}
              <p className="text-[14px] text-body">{sel1.nota}</p>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
