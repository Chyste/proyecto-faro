import { useEffect, useState } from 'react';
import LevelBadge from '../ui/LevelBadge';
import ApiBoundary from '../ui/ApiBoundary';
import { useApi } from '../../lib/useApi';
import { fechaCorta, getLlamada, getLlamadas, hora, type LlamadaDetalleApi, type ObsApi } from '../../lib/panelApi';
import { DIMENSIONES, formatValor } from '../../lib/liveApi';

const IND_LABEL = Object.fromEntries(DIMENSIONES.flatMap((d) => d.indicadores.map((i) => [i.code, i.label])));
const ESTADO_LLAMADA: Record<string, string> = {
  completada: 'Completada', parcial: 'Parcial', sin_respuesta: 'Sin respuesta', rechazada: 'Rechazada', fallo_tecnico: 'Fallo técnico',
};

function Chip({ o }: { o: ObsApi }) {
  const informado = o.estado === 'informado';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[11px] text-body">
      <b className="font-semibold text-ink">{IND_LABEL[o.indicador] ?? o.indicador}</b>
      {informado ? formatValor(o.valor) : o.estado.replace(/_/g, ' ')} · fuente {o.fuente === 'regla' ? 'Regla' : 'IA'}
    </span>
  );
}

function Detalle({ c }: { c: LlamadaDetalleApi }) {
  const razon = c.evaluacion?.razones?.[0];
  const evidencias = c.observaciones.filter((o) => o.cita);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-surface-soft px-3 py-2">
        <span className="text-[13px] font-medium text-ink">Llamada automática · {fechaCorta(c.fecha)} {hora(c.fecha)}</span>
        <span className="text-[12px] text-muted">{ESTADO_LLAMADA[c.estado] ?? c.estado} · {c.turnos.length} mensajes</span>
        <LevelBadge level={c.evaluacion?.nivel ?? 'na'} className="ml-auto" />
      </div>
      {razon && <p className="text-[13px] leading-[19px] text-body">{razon.explanation}</p>}
      {c.evento_urgente && <p className="rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] font-medium text-l3-fg">Evento urgente detectado por reglas: «{c.evento_urgente.cita}»</p>}
      {c.turnos.length === 0 && <p className="text-[13px] text-muted">Esta llamada no tiene transcripción (no hubo conversación).</p>}
      <ol className="flex flex-col gap-3">
        {c.turnos.map((t) => t.rol === 'asistente' ? (
          <li key={t.turno} className="max-w-[88%] self-start rounded-[14px] bg-surface-strong px-3.5 py-2.5 text-[13px] leading-[19px] text-body">
            <span className="mb-0.5 block text-[11px] font-semibold text-muted">Asistente</span>{t.texto}
          </li>
        ) : (
          <li key={t.turno} className="flex flex-col items-end gap-1.5">
            <div className="max-w-[88%] rounded-[14px] bg-ink px-3.5 py-2.5 text-[13px] leading-[19px] text-white">
              <span className="mb-0.5 block text-[11px] font-semibold opacity-70">Persona</span>«{t.texto}»
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {t.observaciones.map((o) => <Chip key={o.indicador} o={o} />)}
            </div>
          </li>
        ))}
      </ol>
      {evidencias.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-hairline-soft pt-3">
          <h3 className="text-[13px] font-semibold text-ink">Evidencia citada</h3>
          {evidencias.map((o, i) => <p key={i} className="rounded-lg bg-surface-soft p-2.5 text-[12px] leading-[17px] text-body">«{o.cita}»</p>)}
        </section>
      )}
    </>
  );
}

/** Transcript of the person's automatic calls, read from /api/llamadas. `onVista` marks the transcript as reviewed. */
export default function Transcripcion({ personaId, onVista, inicial }: { personaId: number; onVista?: () => void; inicial?: number }) {
  const lista = useApi(() => getLlamadas(personaId), [personaId], { personaId });
  const [sel, setSel] = useState<number | null>(null);
  const recientes = (lista.data ?? []).filter((c) => c.mensajes > 0).slice(0, 5);
  const activo = sel ?? inicial ?? recientes[0]?.id ?? null;
  const det = useApi(() => (activo === null ? Promise.resolve(null) : getLlamada(activo)), [activo]);
  useEffect(() => { if (det.data) onVista?.(); }, [det.data, onVista]);

  return (
    <ApiBoundary state={lista}>
      {() => recientes.length === 0 ? <p className="text-[13px] text-muted">Esta persona aún no tiene llamadas con transcripción.</p> : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {recientes.map((x) => (
              <button key={x.id} type="button" onClick={() => setSel(x.id)} aria-pressed={x.id === activo}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${x.id === activo ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink'}`}>
                {fechaCorta(x.fecha)}
              </button>
            ))}
          </div>
          <ApiBoundary state={det} rows={3}>{(c) => (c ? <Detalle c={c} /> : null)}</ApiBoundary>
        </>
      )}
    </ApiBoundary>
  );
}
