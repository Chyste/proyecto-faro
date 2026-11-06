import { DIMENSIONES, type Observacion } from '../../lib/liveApi';
import type { ObsApi, PersonaDetalleApi } from '../../lib/panelApi';
import { primerNombre } from '../../lib/panelApi';
import LevelBadge from '../ui/LevelBadge';
import { FIELD_LABEL, valuePhrase } from './liveModel';

interface Props {
  persona: PersonaDetalleApi | null;
  baseline: Record<string, ObsApi> | null;
  obs: Record<string, Observacion>;
  niveles: Record<string, number | null>;
  order: string[];
  terminada: boolean;
}

const SI_NO: Record<string, string> = { si: 'Sí', no: 'No', desconocido: '—', desconocida: '—' };

/** Live profile: person fields + five dimensions updating from session events + diff against the pre-call state. */
export default function FichaEnVivo({ persona, baseline, obs, niveles, order, terminada }: Props) {
  if (!persona) return <section className="ev-card ev-feed"><p className="ev-empty">Cargando la ficha de la persona…</p></section>;
  const p = persona.perfil;
  const campos: [string, string][] = [
    ['Edad', `${p.edad ?? '—'} años`], ['Comuna', p.comuna ?? '—'], ['Vive sola', SI_NO[p.vive_sola] ?? '—'],
    ['Autonomía base', p.autonomia_base ?? '—'], ['Red de apoyo', p.red_apoyo_base ?? '—'],
    ['Contacto de confianza', persona.contacto_confianza ? `${persona.contacto_confianza.nombre} (${persona.contacto_confianza.relacion})` : '—'],
    ['Responsable', persona.responsable ? primerNombre(persona.responsable) : 'Sin asignar'], ['Frecuencia de llamadas', persona.frecuencia],
  ];
  const cambios = order.filter((c) => obs[c]).flatMap((c) => {
    const nuevo = valuePhrase(obs[c]);
    const b = baseline?.[c];
    const previo = b ? valuePhrase({ indicador: c, valor: b.valor, estado: b.estado }) : 'sin registro previo';
    return previo === nuevo ? [] : [{ c, previo, nuevo }];
  });
  return (
    <section className="ev-card ev-feed" aria-label="Ficha en vivo">
      <h2 className="ev-h2">Ficha en vivo · {p.nombre}</h2>
      <dl className="ev-ficha-grid">
        {campos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <h3 className="ev-ficha-sub">Cinco dimensiones</h3>
      <ul className="ev-feed-list">
        {DIMENSIONES.map((d) => {
          const lvl = niveles[d.code];
          return (
            <li key={d.code} className="ev-obs">
              <div className="ev-obs-head">
                <span className="ev-obs-label">{d.nombre}</span>
                <LevelBadge level={lvl === null || lvl === undefined ? 'na' : (lvl as 0 | 1 | 2 | 3)} />
              </div>
              {d.indicadores.map((i) => {
                const live = obs[i.code];
                const b = baseline?.[i.code];
                const texto = live ? valuePhrase(live) : b ? valuePhrase({ indicador: i.code, valor: b.valor, estado: b.estado }) : 'Sin información';
                return (
                  <p key={i.code} className={`ev-ficha-ind ${live ? 'ev-ficha-live' : ''}`}>
                    <span>{i.label}</span><b>{texto}</b>{!live && b && <em> · llamada anterior</em>}
                  </p>
                );
              })}
            </li>
          );
        })}
      </ul>
      <h3 className="ev-ficha-sub">Cambios en esta llamada</h3>
      {cambios.length === 0 ? <p className="ev-empty">{terminada ? 'La llamada no cambió lo que ya se sabía.' : 'Aún no hay cambios respecto de la llamada anterior.'}</p> : (
        <ul className="ev-feed-list">
          {cambios.map((x) => (
            <li key={x.c} className="ev-obs ev-rise"><span className="ev-obs-label">{FIELD_LABEL[x.c] ?? x.c}</span>
              <p className="ev-obs-value">{x.previo} <span aria-hidden>→</span> <b>{x.nuevo}</b></p></li>
          ))}
        </ul>
      )}
      {terminada && <p className="ev-quote">Llamada guardada: la bandeja y la ficha de {p.nombre} ya se actualizaron.</p>}
    </section>
  );
}
