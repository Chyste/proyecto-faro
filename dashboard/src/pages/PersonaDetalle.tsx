import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActions } from '../components/actions/ActionModals';
import Decisiones, { DerivacionChip } from '../components/actions/Decisiones';
import ApiBoundary from '../components/ui/ApiBoundary';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import { useApi } from '../lib/useApi';
import { DIMENSIONES, formatValor } from '../lib/liveApi';
import {
  ESTADO_REVISION_LABEL, fechaCorta, fechaHora, getPersona, primerNombre, proximaTexto, type Nivel, type PersonaDetalleApi,
} from '../lib/panelApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const FG: Record<Nivel, string> = { 0: 'var(--color-l0-fg)', 1: 'var(--color-l1-fg)', 2: 'var(--color-l2-fg)', 3: 'var(--color-l3-fg)' };
const BG: Record<Nivel, string> = { 0: 'var(--color-l0-bg)', 1: 'var(--color-l1-bg)', 2: 'var(--color-l2-bg)', 3: 'var(--color-l3-bg)' };
const IND_LABEL = Object.fromEntries(DIMENSIONES.flatMap((d) => d.indicadores.map((i) => [i.code, i.label])));
const ESTADO_LLAMADA: Record<string, string> = { completada: 'Completada', parcial: 'Parcial', sin_respuesta: 'Sin respuesta', rechazada: 'Rechazada', fallo_tecnico: 'Fallo técnico' };
const SI_NO: Record<string, string> = { si: 'Sí', no: 'No', desconocido: '—', desconocida: '—' };

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'red', label: 'Red de apoyo' },
  { key: 'pref', label: 'Preferencias y consentimiento' },
  { key: 'salud', label: 'Salud*' },
  { key: 'actividad', label: 'Actividad' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function Row2({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-4 border-t border-hairline-soft py-2.5 first:border-t-0">
      <span className="w-[200px] shrink-0 text-[13px] text-muted">{k}</span>
      <span className="flex-1 text-[14px] leading-[20px] text-ink">{v && v.trim() ? v : '—'}</span>
    </div>
  );
}

const OutlineBtn = ({ children, onClick }: { children: string; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-full border border-ink bg-canvas px-6 py-3 text-[14px] font-semibold whitespace-nowrap text-ink">{children}</button>
);

export default function PersonaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pid = Number(id);
  const api = useApi(() => getPersona(pid), [pid], { personaId: pid });
  return (
    <main className="flex flex-col gap-[18px] px-8 py-6">
      <ApiBoundary state={api} rows={4}>{(p) => <Ficha p={p} />}</ApiBoundary>
      {api.error && !api.data && (
        <Link to="/personas" className="underline">Volver al listado</Link>
      )}
    </main>
  );
}

function Ficha({ p }: { p: PersonaDetalleApi }) {
  const { open } = useActions();
  const [tab, setTab] = useState<Tab>('resumen');
  const salud = useApi(() => (tab === 'salud' ? getPersona(p.id, true) : Promise.resolve(null)), [p.id, tab], { personaId: p.id });
  const nivel = p.nivel;
  const motivo = p.razones[0]?.explicacion ?? p.motivo;
  const cerrado = p.estado_revision === 'revisado';
  const ultima = p.linea_tiempo[13]?.fecha ?? p.linea_tiempo.at(-1)?.fecha;
  const estadoCaso = cerrado ? 'Caso cerrado' : p.estado_revision === 'en_revision' || p.estado_revision === 'derivado' ? 'Caso en revisión' : p.estado_revision === 'pendiente' ? 'Caso pendiente de revisión' : 'Sin casos abiertos';
  const cierre = p.decisiones.find((d) => d.accion === 'cerrar');

  return (
    <>
      <div className="flex items-center">
        <p className="text-[13px] text-muted"><Link to="/personas" className="hover:underline">Personas</Link> / {p.nombre}</p>
        <div className="flex-1" />
        <DemoPill />
      </div>

      <section className={`flex flex-col gap-4 p-5 ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hairline-soft text-[22px] font-semibold text-ink">{p.nombre[0]}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-[22px] font-bold leading-tight text-ink">{p.nombre} · {p.edad} años · {p.comuna}</h1>
            <p className="text-[13px] text-muted">
              Responsable: {p.responsable ? primerNombre(p.responsable) : 'Sin asignar'} &nbsp;·&nbsp; Próxima llamada automática: {proximaTexto(p.proxima_llamada, p.pausada)} &nbsp;·&nbsp; Revisión: {ESTADO_REVISION_LABEL[p.estado_revision]}
              {p.pausada ? ' · Seguimiento pausado' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {p.derivacion && !cerrado && <DerivacionChip d={p.derivacion} withDate />}
              <span className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px] font-medium text-body">{estadoCaso}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2.5">
            {!p.responsable && <OutlineBtn onClick={() => open('asignar', p.id)}>Asignarme</OutlineBtn>}
            <button type="button" onClick={() => open('transcripcion', p.id)} className="rounded-full bg-ink px-6 py-3 text-[14px] font-semibold whitespace-nowrap text-white">Revisar transcripción</button>
            <OutlineBtn onClick={() => open('derivar', p.id)}>Derivar</OutlineBtn>
            <OutlineBtn onClick={() => open('cerrar', p.id)}>Cerrar con decisión</OutlineBtn>
          </div>
        </div>
        <hr className="border-hairline-soft" />
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium text-muted">Nivel actual</span>
          <LevelBadge level={nivel === null ? 'na' : nivel} />
          <p className="flex-1 text-[13px] leading-[19px] text-body">{motivo ? `Motivo: ${motivo}` : 'Aún no hay una evaluación vigente.'}</p>
          <span className="text-[11px] whitespace-nowrap text-muted">Reglas explícitas · sin IA</span>
        </div>
        {cerrado && cierre && (
          <p className="rounded-[10px] bg-surface-soft px-3 py-2 text-[13px] text-body">
            Cerrado como «{cierre.resultado}» por {cierre.autor} el {fechaHora(cierre.fecha)}.{cierre.nota ? ` Nota: ${cierre.nota}` : ''} (el nivel calculado se mantiene).
          </p>
        )}
        {nivel === 3 && !cerrado && <p className="anim-ring-l3 rounded-[10px] bg-l3-bg px-3 py-2 text-[13px] font-medium text-l3-fg">Situación de riesgo · Activación simulada del protocolo. Revisa la transcripción y decide.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-muted">Más decisiones</span>
          <OutlineBtn onClick={() => open('contacto', p.id)}>Avisar a contacto de confianza</OutlineBtn>
          <OutlineBtn onClick={() => open('llamadaHumana', p.id)}>Solicitar llamada humana del equipo</OutlineBtn>
          <OutlineBtn onClick={() => open('frecuencia', p.id)}>Ajustar frecuencia de llamadas automáticas</OutlineBtn>
        </div>
      </section>

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-[14px] font-medium ${tab === t.key ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink hover:bg-surface-soft'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'red' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-2 text-[16px] font-semibold text-ink">Red de apoyo</h2>
          <Row2 k="Contacto de confianza" v={p.contacto_confianza ? `${p.contacto_confianza.nombre} (${p.contacto_confianza.relacion})${p.contacto_confianza.autorizado ? ' · autorizado para avisos' : ' · sin autorización de aviso'}` : undefined} />
          <Row2 k="Vive sola" v={SI_NO[p.perfil.vive_sola]} />
          <Row2 k="Apoyo" v={p.perfil.red_apoyo_base} />
          <Row2 k="Autonomía base" v={p.perfil.autonomia_base} />
        </section>
      )}

      {tab === 'pref' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-2 text-[16px] font-semibold text-ink">Preferencias y consentimiento</h2>
          <Row2 k="Horario preferido" v={p.perfil.horario_preferido} />
          <Row2 k="Canal" v="Llamada automática de voz (simulada)" />
          <Row2 k="Frecuencia de llamadas" v={p.frecuencia} />
          <Row2 k="Consentimiento vigente" v={p.consentimiento ? `${p.consentimiento.revocado ? 'Revocado' : 'Sí'} · registrado el ${fechaCorta(p.consentimiento.otorgado)} · seguimiento ${p.consentimiento.checkin ? 'sí' : 'no'}, datos sensibles ${p.consentimiento.datos_sensibles ? 'sí' : 'no'}, terceros ${p.consentimiento.terceros ? 'sí' : 'no'}` : 'Sin registro'} />
          <Row2 k="Intereses" v={p.perfil.intereses.join(', ')} />
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={p.pausada} onClick={() => open('pausar', p.id)} className="rounded-full border border-ink bg-canvas px-5 py-2.5 text-[14px] font-semibold text-ink disabled:opacity-40">
              {p.pausada ? 'Seguimiento pausado' : 'Pausar seguimiento'}
            </button>
            <span className="text-[12px] text-muted">Queda registrado quién, cuándo y por qué.</span>
          </div>
        </section>
      )}

      {tab === 'salud' && (
        <section className={`flex flex-col p-5 ${card}`}>
          <h2 className="mb-1 text-[16px] font-semibold text-ink">Salud*</h2>
          <p className="mb-2 text-[12px] text-muted">* Visible según habilitación; se pide a la API solo al abrir esta pestaña.</p>
          <Row2 k="En tratamiento" v={SI_NO[p.perfil.tiene_tratamiento]} />
          {salud.data?.perfil.medicamentos?.length ? (
            salud.data.perfil.medicamentos.map((m) => <Row2 key={m.name} k="Medicamento declarado" v={`${m.name} (${m.source ?? 'ficha'}${m.verified_at ? `, ${fechaCorta(m.verified_at)}` : ''})`} />)
          ) : (
            <Row2 k="Medicamentos declarados" v={salud.loading ? 'Cargando…' : '—'} />
          )}
        </section>
      )}

      {tab === 'actividad' && <Decisiones decisiones={p.decisiones} personaId={p.id} title="Actividad · decisiones humanas" />}

      {tab === 'resumen' && (
        <>
          <Decisiones decisiones={p.decisiones} personaId={p.id} />

          <h2 className="text-[16px] font-semibold text-ink">Cinco dimensiones · última evaluación{ultima ? `, ${fechaCorta(ultima)}` : ''}</h2>
          <div className="grid grid-cols-5 gap-4">
            {p.dimensiones.map((d) => {
              const inf = d.indicadores.filter((o) => o.estado === 'informado');
              return (
                <article key={d.dimension} className={`flex flex-col gap-2.5 p-4 ${card}`}>
                  <h3 className="text-[13px] font-semibold text-ink">{d.nombre}</h3>
                  <LevelBadge level={d.nivel === null ? 'na' : d.nivel} className="self-start" />
                  <p className="text-[13px] leading-[19px] text-body">{inf.length ? `${inf.length} indicador${inf.length === 1 ? '' : 'es'} informado${inf.length === 1 ? '' : 's'}` : 'Sin indicadores informados'}</p>
                  <div className="flex flex-col gap-1 rounded-lg bg-surface-soft p-2.5 text-[12px] leading-[17px] text-body">
                    {d.indicadores.length === 0 && '—'}
                    {d.indicadores.slice(0, 3).map((o) => (
                      <span key={o.indicador}><b>{IND_LABEL[o.indicador] ?? o.indicador}:</b> {o.estado === 'informado' ? formatValor(o.valor) : o.estado.replace(/_/g, ' ')}{o.cita ? ` «${o.cita}»` : ''}</span>
                    ))}
                  </div>
                  <p className="text-[11px] leading-[14px] text-muted">Fuente: llamada automática{d.indicadores[0] ? ` · ${fechaCorta(d.indicadores[0].observado_en)}` : ''}</p>
                </article>
              );
            })}
          </div>

          <div className="flex items-start gap-4">
            <section className={`flex min-w-0 flex-1 flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-[16px] font-semibold text-ink">Evolución · últimos 14 días ({fechaCorta(p.linea_tiempo[0].fecha)} – {fechaCorta(p.linea_tiempo[13].fecha)})</h2>
              <div className="flex items-center">
                <span className="w-[172px] shrink-0 text-[13px] font-medium text-ink">Nivel general</span>
                <div className="flex gap-[7px]">
                  {p.linea_tiempo.map((t) => (
                    <div key={t.fecha} className="flex flex-col items-center gap-1">
                      {t.nivel === null ? (
                        <div className="flex size-[30px] items-center justify-center rounded-lg border border-dashed border-muted bg-surface-soft text-[13px] font-semibold text-muted" title={t.estado_llamada ? `Sin evaluación (${t.estado_llamada.replace(/_/g, ' ')})` : 'Sin llamada'}>–</div>
                      ) : (
                        <div className="flex size-[30px] items-center justify-center rounded-lg border border-solid text-[13px] font-semibold" style={{ background: BG[t.nivel], color: FG[t.nivel], borderColor: FG[t.nivel] }} title={`Nivel ${t.nivel}`}>{t.nivel}</div>
                      )}
                      <span className="text-[10px] text-muted">{Number(t.fecha.slice(8))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] leading-[15px] text-muted">
                Número = nivel de atención (0 habitual · 1 preventiva · 2 prioritaria · 3 urgente). Punteado = sin evaluación ese día; un hueco nunca se lee como mejoría ni como alarma.
              </p>
            </section>

            <section className={`flex w-[400px] shrink-0 flex-col gap-3 p-5 ${card}`}>
              <h2 className="text-[16px] font-semibold text-ink">Llamadas automáticas recientes</h2>
              {p.llamadas_recientes.slice(0, 4).map((c, i) => (
                <button key={c.id} type="button" onClick={() => open('transcripcion', p.id)} className={`flex items-center gap-2.5 text-left ${i > 0 ? 'border-t border-hairline-soft pt-3' : ''}`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-ink">{fechaCorta(c.fecha)} {c.fecha.slice(11, 16)} · Llamada automática</span>
                    <span className="text-[12px] text-muted">{ESTADO_LLAMADA[c.estado] ?? c.estado} · {c.canal}</span>
                  </div>
                  <LevelBadge level={c.nivel === null ? 'na' : c.nivel} />
                </button>
              ))}
              <p className="border-t border-hairline-soft pt-3 text-[12px] text-muted">Próxima llamada automática: {proximaTexto(p.proxima_llamada, p.pausada)}</p>
            </section>
          </div>
        </>
      )}
    </>
  );
}
