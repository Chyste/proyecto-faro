import { DIMENSIONES, type Observacion } from '../../lib/liveApi';
import { DimIcon } from './icons';
import { Ring } from './viz';
import { levelTone, valuePhrase } from './liveModel';

interface Props { obs: Record<string, Observacion>; niveles: Record<string, number | null>; flash: Record<string, number>; order: string[] }

export default function DimensionTiles({ obs, niveles, flash, order }: Props) {
  return (
    <section className="ev-tiles" aria-label="Dimensiones evaluadas">
      {DIMENSIONES.map((d) => {
        const codes = d.indicadores.map((i) => i.code);
        const answered = codes.filter((c) => obs[c]).length;
        const latest = order.find((c) => codes.includes(c));
        const o = latest ? obs[latest] : undefined;
        const lvl = niveles[d.code] ?? null;
        const hot = codes.some((c) => flash[c]);
        return (
          <article key={d.code} className={`ev-card ev-tile ev-tone-${levelTone(lvl)} ${hot ? 'ev-tile-hot' : ''}`}>
            <div className="ev-tile-top">
              <span className="ev-tile-icon"><DimIcon code={d.code} /></span>
              <Ring value={answered} total={codes.length} size={38} stroke={4} />
            </div>
            <h3>{d.nombre}</h3>
            <p className={`ev-tile-value ${o ? '' : 'ev-muted'}`}>{o ? valuePhrase(o) : 'Sin información aún'}</p>
          </article>
        );
      })}
    </section>
  );
}
