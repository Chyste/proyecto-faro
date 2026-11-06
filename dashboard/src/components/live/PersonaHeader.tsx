import { initials, mmss } from './liveModel';
import type { PersonaLive } from '../../lib/liveApi';

export default function PersonaHeader({ persona, activa, terminada, segundos }:
  { persona: PersonaLive | undefined; activa: boolean; terminada: boolean; segundos: number }) {
  return (
    <section className="ev-card ev-persona">
      <div className="ev-avatar ev-avatar-lg" aria-hidden>{persona ? initials(persona.preferred_name) : '·'}</div>
      <div className="ev-persona-info">
        <h2>{persona?.preferred_name ?? 'Sin persona seleccionada'}</h2>
        <p>{persona ? `${persona.age ?? '—'} años · ${persona.comuna ?? 'comuna sin registrar'}` : 'Elija una persona para comenzar'}</p>
      </div>
      <div className="ev-call-state">
        {activa && <span className="ev-live-pill"><span className="ev-pulse" aria-hidden />Llamada automática en curso</span>}
        {terminada && <span className="ev-ended-pill">Llamada terminada</span>}
        {!activa && !terminada && <span className="ev-ended-pill">Lista para iniciar</span>}
        <span className="ev-timer" aria-label="Duración de la llamada">{mmss(segundos)}</span>
      </div>
    </section>
  );
}
