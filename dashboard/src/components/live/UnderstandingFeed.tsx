import { DIMENSIONES, FUENTE_LABEL, type Observacion } from '../../lib/liveApi';
import { ESTADO_CHIP, FIELD_LABEL, valuePhrase } from './liveModel';

interface Props { obs: Record<string, Observacion>; order: string[]; flash: Record<string, number> }

export default function UnderstandingFeed({ obs, order, flash }: Props) {
  const pendientes = DIMENSIONES.flatMap((d) => d.indicadores).filter((i) => !obs[i.code]);
  const items = order.filter((c) => obs[c]);
  return (
    <section className="ev-card ev-feed">
      <h2 className="ev-h2">Lo que entiende la IA</h2>
      {items.length === 0 && <p className="ev-empty">Aún no hay campos reconocidos.</p>}
      <ul className="ev-feed-list">
        {items.map((c) => {
          const o = obs[c], chip = ESTADO_CHIP[o.estado] ?? { label: o.estado, tone: 'muted' as const };
          const pct = Math.round((o.confianza ?? 0) * 100);
          return (
            <li key={c} className={`ev-obs ev-rise ${flash[c] ? 'ev-obs-hot' : ''}`}>
              <div className="ev-obs-head">
                <span className="ev-obs-label">{FIELD_LABEL[c] ?? c}</span>
                <span className={`ev-state ev-state-${chip.tone}`}>{chip.label}</span>
              </div>
              <p className="ev-obs-value">{valuePhrase(o)}</p>
              <div className="ev-conf" title={`Confianza ${pct}%`}>
                <span className="ev-conf-track"><span className="ev-conf-bar" style={{ width: `${pct}%` }} /></span>
                <span className="ev-conf-num">{o.confianza === null ? '—' : `${pct}%`}</span>
              </div>
              {o.cita && <p className="ev-quote">«{o.cita}» <span>· {FUENTE_LABEL[o.fuente] ?? o.fuente}</span></p>}
            </li>
          );
        })}
      </ul>
      {pendientes.length > 0 && (
        <details className="ev-pending">
          <summary>Campos pendientes ({pendientes.length})</summary>
          <div className="ev-chips">{pendientes.map((i) => <span key={i.code} className="ev-grey-chip">{i.label}</span>)}</div>
        </details>
      )}
    </section>
  );
}
