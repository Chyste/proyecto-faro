import { Link, useParams } from 'react-router-dom';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import ApiBoundary from '../components/ui/ApiBoundary';
import { useActions } from '../components/actions/ActionModals';
import { useApi } from '../lib/useApi';
import { DIMENSIONES, formatValor } from '../lib/liveApi';
import {
  accionLabel, fechaCorta, fechaHora, getAlerta, getAlertas, primerNombre, type AlertaItem, type ObsApi,
} from '../lib/panelApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const ESTADO = { abierta: 'Abierta', en_revision: 'En revisión', cerrada: 'Cerrada' } as const;
const IND_LABEL = Object.fromEntries(DIMENSIONES.flatMap((d) => d.indicadores.map((i) => [i.code, i.label])));
const SUGERIDA: Record<number, string> = {
  3: 'Revisar la transcripción y decidir hoy: derivar, avisar al contacto autorizado o solicitar una llamada humana.',
  2: 'Revisar la transcripción esta semana y decidir si derivar o solicitar una llamada humana.',
  1: 'Revisar la transcripción y, si corresponde, ajustar la frecuencia de llamadas automáticas.',
};

export default function AlertasPage() {
  const { id } = useParams<{ id: string }>();
  return id ? <Detalle id={id} /> : <Lista />;
}

function Lista() {
  const api = useApi(() => getAlertas(), []);
  return (
    <main className="flex flex-col gap-[18px] px-8 pt-8 pb-7">
      <ApiBoundary state={api}>
        {(todas) => {
          const open = todas.filter((a) => a.estado !== 'cerrada');
          return (
            <>
              <div className="flex items-start gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <h1 className="text-[28px] font-bold leading-tight text-ink">Alertas abiertas</h1>
                  <p className="text-[14px] text-muted">{open.length} alertas · ordenadas por nivel de atención</p>
                </div>
                <DemoPill />
              </div>
              <div className={`overflow-hidden ${card}`}>
                {open.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">No hay alertas abiertas.</p>}
                {open.map((r, i) => <Fila key={r.id} r={r} first={i === 0} />)}
              </div>
            </>
          );
        }}
      </ApiBoundary>
    </main>
  );
}

function Fila({ r, first }: { r: AlertaItem; first: boolean }) {
  return (
    <Link to={`/alertas/${r.id}`} className={`row-link flex items-center gap-4 px-5 py-4 ${first ? '' : 'border-t border-hairline-soft'} ${r.nivel === 3 ? 'anim-ring-l3-inset bg-l3-bg' : ''}`}>
      <div className="flex w-[160px] shrink-0 flex-col">
        <span className="text-[15px] font-semibold text-ink">{r.persona}</span>
        <span className="text-[12px] text-muted">{r.edad} · {r.comuna}</span>
      </div>
      <div className="w-[190px] shrink-0"><LevelBadge level={r.nivel} /></div>
      <p className="min-w-0 flex-1 text-[13px] leading-[19px] text-body line-clamp-2">{r.explicacion}</p>
      <span className="w-[100px] shrink-0 text-[13px] text-body">{ESTADO[r.estado]}</span>
      <span className="shrink-0 text-[13px] font-semibold text-ink">Revisar <span className="row-chevron" aria-hidden>›</span></span>
    </Link>
  );
}

function Evidencia({ o }: { o: ObsApi }) {
  return (
    <div className="rounded-lg bg-surface-soft p-3">
      <p className="text-[13px] leading-[19px] text-body">
        {o.cita ? `«${o.cita}»` : <><b>{IND_LABEL[o.indicador] ?? o.indicador}</b>: {o.estado === 'informado' ? formatValor(o.valor) : o.estado.replace(/_/g, ' ')}</>}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        Fuente: llamada automática · {fechaCorta(o.observado_en)} · {IND_LABEL[o.indicador] ?? o.indicador} · {o.fuente === 'regla' ? 'regla' : 'IA'}
      </p>
    </div>
  );
}

function Detalle({ id }: { id: string }) {
  const { open } = useActions();
  const api = useApi(() => getAlerta(id), [id]);
  return (
    <main className="flex flex-col gap-[18px] px-8 py-6">
      <ApiBoundary state={api}>
        {(a) => {
          const p = a.persona;
          return (
            <>
              <div className="flex items-center">
                <p className="text-[13px] text-muted">
                  <Link to="/alertas" className="hover:underline">Alertas</Link> / Revisión de alerta · {p.nombre}
                </p>
                <div className="flex-1" />
                <DemoPill />
              </div>

              {a.nivel === 3 && a.estado !== 'cerrada' && (
                <div className="anim-slide-down anim-ring-l3 rounded-[14px] bg-l3-bg px-5 py-4 text-l3-fg">
                  <p className="text-[15px] font-bold">Situación de riesgo · Activación simulada del protocolo</p>
                  <p className="mt-1 text-[13px] leading-[19px]">
                    Revisa la transcripción de la llamada automática y decide: derivar a una institución, avisar al contacto de confianza o solicitar una llamada humana del equipo.
                  </p>
                </div>
              )}

              <section className={`flex items-center gap-4 p-5 ${card}`}>
                <div className="flex flex-1 flex-col gap-1">
                  <h1 className="text-[22px] font-bold text-ink">{p.nombre} · {p.edad} años · {p.comuna}</h1>
                  <p className="text-[13px] text-muted">
                    Responsable: {a.responsable ? primerNombre(a.responsable) : 'Sin asignar'} · Alerta {ESTADO[a.estado].toLowerCase()} · creada {fechaHora(a.creada)}
                  </p>
                </div>
                <LevelBadge level={a.nivel} />
              </section>

              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <section className={`flex flex-col gap-2 p-5 ${card}`}>
                    <h2 className="text-[16px] font-semibold text-ink">Qué cambió</h2>
                    <p className="text-[14px] leading-[21px] text-body">{a.explicacion}</p>
                    <p className="text-[12px] text-muted">Regla {a.regla} · origen {a.origen.replace(/_/g, ' ')}</p>
                  </section>
                  <section className={`flex flex-col gap-3 p-5 ${card}`}>
                    <h2 className="text-[16px] font-semibold text-ink">Evidencia</h2>
                    {a.evidencia.length === 0 && <p className="text-[13px] text-muted">Esta alerta no se apoya en indicadores de salud (por ejemplo, no se pudo contactar a la persona).</p>}
                    {a.evidencia.map((o) => <Evidencia key={`${o.conversacion_id}-${o.indicador}`} o={o} />)}
                  </section>
                  <section className={`flex flex-col gap-2 p-5 ${card}`}>
                    <h2 className="text-[16px] font-semibold text-ink">Decisiones sobre esta alerta</h2>
                    {a.decisiones.length === 0 && <p className="text-[13px] text-muted">Aún no hay decisiones humanas registradas.</p>}
                    {a.decisiones.map((d) => (
                      <p key={d.id} className="text-[13px] text-body"><b>{accionLabel(d.accion)}</b> · {d.autor}, {fechaHora(d.fecha)}{d.nota ? ` · ${d.nota}` : ''}</p>
                    ))}
                  </section>
                </div>

                <section className={`flex w-[340px] shrink-0 flex-col gap-3 p-5 ${card}`}>
                  <h2 className="text-[16px] font-semibold text-ink">Tu decisión</h2>
                  <p className="text-[13px] leading-[19px] text-body">Acción sugerida: {SUGERIDA[a.nivel] ?? '—'}</p>
                  <p className="text-[12px] text-muted">Cada decisión queda registrada con tu nombre, la fecha y una nota.</p>
                  {!a.responsable && <button type="button" onClick={() => open('asignar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">Asignarme</button>}
                  <button type="button" onClick={() => open('transcripcion', p.id)} className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">Revisar transcripción</button>
                  <button type="button" onClick={() => open('derivar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">Derivar</button>
                  <button type="button" onClick={() => open('contacto', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">Avisar a contacto de confianza</button>
                  <button type="button" onClick={() => open('llamadaHumana', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">Solicitar llamada humana del equipo</button>
                  <button type="button" onClick={() => open('frecuencia', p.id)} className="rounded-full border border-hairline px-5 py-2 text-[13px] font-semibold text-ink">Ajustar frecuencia de llamadas automáticas</button>
                  <button type="button" onClick={() => open('cerrar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">Cerrar con decisión</button>
                  <Link to={`/personas/${p.id}`} className="text-[13px] text-muted underline">Ver ficha completa</Link>
                </section>
              </div>
            </>
          );
        }}
      </ApiBoundary>
    </main>
  );
}
