import { Donut, Gauge, Sparkline } from './viz';
import { seconds, TOTAL_FIELDS } from './liveModel';
import type { Observacion, Stats } from '../../lib/liveApi';

export default function StatsStrip({ stats, obs }: { stats: Stats; obs: Record<string, Observacion> }) {
  const list = Object.values(obs);
  const reconocidos = list.filter((o) => o.estado === 'informado').length;
  const noSabe = list.filter((o) => o.estado === 'no_sabe' || o.estado === 'prefiere_no_responder').length;
  const fuera = stats.fuera_de_tema ?? 0;
  const porResponder = Math.max(TOTAL_FIELDS - list.length, 0);
  const lat = stats.latencias_ms ?? [];
  return (
    <section className="ev-card ev-stats" aria-label="Estadísticas de la llamada">
      <div className="ev-stat ev-stat-donut">
        <Donut centerTop={`${reconocidos}/${TOTAL_FIELDS}`} centerBottom="reconocidos" segments={[
          { label: 'Reconocidos', value: reconocidos, cls: 'ev-seg-ok' },
          { label: 'No sabe', value: noSabe, cls: 'ev-seg-muted' },
          { label: 'Fuera de tema', value: fuera, cls: 'ev-seg-warn' },
          { label: 'Por responder', value: porResponder, cls: 'ev-seg-rest' }]} />
        <ul className="ev-legend">
          <li><i className="ev-dot ev-seg-ok" />Reconocidos <b>{reconocidos}</b></li>
          <li><i className="ev-dot ev-seg-muted" />No sabe <b>{noSabe}</b></li>
          <li><i className="ev-dot ev-seg-warn" />Fuera de tema <b>{fuera}</b></li>
          <li><i className="ev-dot ev-seg-rest" />Por responder <b>{porResponder}</b></li>
        </ul>
      </div>
      <div className="ev-stat"><p className="ev-kicker">Confianza media</p><Gauge value={stats.confianza_media} /></div>
      <div className="ev-stat"><p className="ev-kicker">Turnos</p><p className="ev-big">{stats.turnos}</p></div>
      <div className="ev-stat" title={lat.length ? lat.map((l) => `${l} ms`).join(' · ') : undefined}>
        <p className="ev-kicker">Respuesta de la IA</p>
        <Sparkline values={lat} />
        <p className="ev-sub">media {seconds(stats.latencia_media_ms)}</p>
      </div>
    </section>
  );
}
