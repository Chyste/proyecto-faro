import { useMemo, useState } from 'react';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import Modal from '../components/ui/Modal';
import ApiBoundary from '../components/ui/ApiBoundary';
import Transcripcion from '../components/actions/Transcripcion';
import { useApi } from '../lib/useApi';
import { accionLabel, fechaCorta, getBandeja, getDecisiones, getLlamadas, hoyHora, type DecisionApi, type LlamadaItem } from '../lib/panelApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const sel = 'rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink';
const ESTADO_LLAMADA: Record<string, string> = { completada: 'Completada', parcial: 'Parcial', sin_respuesta: 'Sin respuesta', rechazada: 'Rechazada', fallo_tecnico: 'Fallo técnico' };

type Entry =
  | { kind: 'llamada'; key: string; ts: string; personaId: number; persona: string; c: LlamadaItem }
  | { kind: 'humana'; key: string; ts: string; personaId: number; persona: string; d: DecisionApi };

export default function SeguimientoPage() {
  const llamadas = useApi(() => getLlamadas(), []);
  const decisiones = useApi(() => getDecisiones(), []);
  const personas = useApi(getBandeja, []);
  const [persona, setPersona] = useState('');
  const [tipo, setTipo] = useState<'' | 'llamada' | 'humana'>('');
  const [sel1, setSel1] = useState<Entry | null>(null);

  const entries = useMemo(() => {
    const out: Entry[] = [];
    for (const c of llamadas.data ?? []) out.push({ kind: 'llamada', key: `c${c.id}`, ts: c.fecha, personaId: c.persona_id, persona: c.persona, c });
    for (const d of decisiones.data ?? []) out.push({ kind: 'humana', key: `d${d.id}`, ts: d.fecha, personaId: d.persona_id, persona: d.persona, d });
    return out.sort((a, b) => b.ts.localeCompare(a.ts));
  }, [llamadas.data, decisiones.data]);

  const visible = entries.filter((e) => (!persona || String(e.personaId) === persona) && (!tipo || e.kind === tipo));

  return (
    <main className="flex flex-col gap-[18px] px-8 pt-8 pb-7">
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Llamadas automáticas y decisiones</h1>
          <p className="text-[14px] text-muted">Las llamadas son eventos del sistema; las decisiones son acciones humanas · {visible.length} registros</p>
        </div>
        <DemoPill />
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="Persona">
          <option value="">Todas las personas</option>
          {(personas.data?.personas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as '' | 'llamada' | 'humana')} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="llamada">Llamadas automáticas (sistema)</option>
          <option value="humana">Decisiones (humanas)</option>
        </select>
      </div>

      <ApiBoundary state={llamadas} rows={6}>
        {() => (
          <div className={`overflow-hidden ${card}`}>
            {visible.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">Sin registros para estos filtros.</p>}
            {visible.map((e, i) => (
              <button key={e.key} type="button" onClick={() => setSel1(e)}
                className={`row-link flex w-full items-center gap-4 px-5 py-3.5 text-left ${e.kind === 'humana' ? 'border-l-4 border-l-ink bg-surface-soft' : 'border-l-4 border-l-transparent'} ${i > 0 ? 'border-t border-hairline-soft' : ''}`}>
                <span className="w-[110px] shrink-0 text-[13px] text-body">{e.kind === 'llamada' ? fechaCorta(e.ts) : hoyHora(e.ts)}</span>
                <span className="w-[130px] shrink-0 text-[14px] font-semibold text-ink">{e.persona}</span>
                {e.kind === 'llamada' ? (
                  <>
                    <span className="w-[180px] shrink-0 text-[13px] text-body">Llamada automática · {e.c.mensajes} mensajes</span>
                    <div className="w-[190px] shrink-0"><LevelBadge level={e.c.nivel === null ? 'na' : e.c.nivel} /></div>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-body">{ESTADO_LLAMADA[e.c.estado] ?? e.c.estado} · {e.c.canal}</span>
                  </>
                ) : (
                  <>
                    <span className="w-[180px] shrink-0 text-[13px] font-semibold text-ink">Decisión · {accionLabel(e.d.accion)}</span>
                    <span className="w-[190px] shrink-0 text-[12px] text-muted">{e.d.autor}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-body">{[e.d.destino, e.d.resultado, e.d.nota].filter(Boolean).join(' · ')}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </ApiBoundary>

      {sel1 && (
        <Modal title={sel1.kind === 'llamada' ? `Llamada automática · ${fechaCorta(sel1.c.fecha)} · ${sel1.persona}` : `Decisión · ${accionLabel(sel1.d.accion)} · ${sel1.persona}`} onClose={() => setSel1(null)} wide>
          {sel1.kind === 'llamada' ? (
            <Transcripcion personaId={sel1.personaId} inicial={sel1.c.id} />
          ) : (
            <>
              <p className="text-[13px] text-muted">{sel1.d.autor} · {hoyHora(sel1.d.fecha)}</p>
              {(sel1.d.destino || sel1.d.resultado) && <p className="text-[14px] font-medium text-ink">{[sel1.d.destino, sel1.d.resultado].filter(Boolean).join(' · ')}</p>}
              <p className="text-[14px] text-body">{sel1.d.nota ?? '—'}</p>
              {sel1.d.estado_derivacion && <p className="text-[13px] text-body">Estado de la derivación: {sel1.d.estado_derivacion}</p>}
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
