import { useActions } from './ActionModals';
import {
  ESTADO_DERIVACION_LABEL, accionLabel, hoyHora, postEstadoDerivacion, type BandejaRow, type DecisionApi, type EstadoDerivacion,
} from '../../lib/panelApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const PASOS: EstadoDerivacion[] = ['enviada', 'recibida', 'atendida'];

/** Chip "Derivado a CESFAM · Enviada" used in ficha header, Hoy and Personas rows. */
export function DerivacionChip({ d, withDate }: { d: NonNullable<BandejaRow['derivacion']>; withDate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-surface-soft px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ink">
      Derivado a {d.destino ?? 'institución'} · {ESTADO_DERIVACION_LABEL[d.estado]}
      {withDate && <span className="font-normal text-muted">· {hoyHora(d.fecha)}</span>}
    </span>
  );
}

function Pasos({ d, personaId }: { d: DecisionApi; personaId: number }) {
  const { toast } = useActions();
  const actual = d.estado_derivacion ?? 'enviada';
  const idx = PASOS.indexOf(actual);
  const next = PASOS[idx + 1];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {PASOS.map((p, i) => (
        <span key={p} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${i <= idx ? 'bg-ink text-white' : 'border border-dashed border-muted text-muted'}`}>
          {ESTADO_DERIVACION_LABEL[p]}
        </span>
      ))}
      {next && (
        <button type="button" className="ml-1 rounded-full border border-ink px-3 py-0.5 text-[11px] font-semibold text-ink"
          onClick={() => postEstadoDerivacion(personaId, d.id, next).then(() => toast(`Derivación marcada como ${ESTADO_DERIVACION_LABEL[next].toLowerCase()}`)).catch((e: Error) => toast(e.message))}>
          Marcar como {ESTADO_DERIVACION_LABEL[next].toLowerCase()}
        </button>
      )}
    </div>
  );
}

/** Newest-first decision log (acción, destino, nota, autor, fecha) with derivation status steps. */
export default function Decisiones({ decisiones, personaId, title = 'Decisiones y derivaciones' }: { decisiones: DecisionApi[]; personaId: number; title?: string }) {
  return (
    <section className={`flex flex-col gap-3 p-5 ${card}`} aria-label={title}>
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {decisiones.length === 0 && (
        <p className="rounded-[10px] bg-surface-soft px-3 py-3 text-[13px] text-muted">Aún no hay decisiones humanas registradas. Revisa la transcripción y decide: derivar, avisar al contacto, solicitar una llamada humana o cerrar.</p>
      )}
      {decisiones.map((d, i) => (
        <div key={d.id} className={`${i > 0 ? 'border-t border-hairline-soft pt-3' : ''}`}>
          <p className="text-[13px] font-semibold text-ink">
            {accionLabel(d.accion)}{d.destino && d.accion !== 'ajustar_frecuencia' ? ` · ${d.destino}` : ''}{d.resultado && d.accion === 'cerrar' ? ` · ${d.resultado}` : ''}
          </p>
          <p className="text-[12px] text-muted">{d.autor} · {hoyHora(d.fecha)}</p>
          {d.nota && <p className="text-[13px] leading-[19px] text-body">{d.nota}</p>}
          {d.accion === 'derivar' && <Pasos d={d} personaId={personaId} />}
        </div>
      ))}
    </section>
  );
}
