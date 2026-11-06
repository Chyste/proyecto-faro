import LevelBadge from '../ui/LevelBadge';
import type { Nivel } from '../../lib/liveApi';
import { levelLabel } from '../ui/LevelBadge';
import { mmss } from './liveModel';

export interface LevelChange { nivel: Nivel; t: number }

export default function LevelHero({ nivel, motivo, cambios, pulse }:
  { nivel: Nivel | null; motivo: string | null; cambios: LevelChange[]; pulse: number }) {
  return (
    <section className={`ev-card ev-hero ev-hero-${nivel === null ? 'na' : `l${nivel}`}`}>
      <p className="ev-kicker">Nivel de atención actual</p>
      <div key={pulse} className="ev-fade">
        <LevelBadge level={nivel ?? 'na'} className="ev-hero-badge" />
        <p className="ev-motivo">{motivo ?? 'Aún sin información suficiente para evaluar.'}</p>
      </div>
      {cambios.length > 0 && (
        <ol className="ev-timeline" aria-label="Cambios de nivel durante la llamada">
          {cambios.map((c, i) => (
            <li key={`${c.t}-${i}`} className={`ev-chip ev-chip-l${c.nivel}`}>
              <b>{mmss(c.t)}</b> {levelLabel(c.nivel)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
