import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAlertas, getPersonas } from '../data/syntheticData';
import LevelBadge from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import { useActions } from '../components/actions/ActionModals';
import { fechaHora, useFaro } from '../state/FaroStore';
import { fechaCorta, NIVEL_TO_LEVEL, nivelDe, primerNombre } from '../lib/faro';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
const ESTADO = { pendiente: 'Pendiente', en_revision: 'En revisión', revisado: 'Revisado', derivado: 'Derivado' } as const;

function useOpenAlerts() {
  const { state } = useFaro();
  return useMemo(() => {
    const alertas = getAlertas();
    return getPersonas()
      .filter((p) => nivelDe(p) > 0 && state.byId[p.id]?.estadoRevision !== 'revisado')
      .map((p) => {
        const a = [...alertas].reverse().find((x) => x.personaId === p.id && x.nivel === p.nivel) ?? alertas.find((x) => x.personaId === p.id);
        return { p, level: nivelDe(p), explicacion: a?.explicacion ?? '—', accion: a?.accionSugerida ?? '—', dominio: a?.dominio };
      })
      .sort((x, y) => y.level - x.level);
  }, [state]);
}

export default function AlertasPage() {
  const { id } = useParams<{ id: string }>();
  const open = useOpenAlerts();
  return id ? <Detalle id={id} /> : <Lista open={open} />;
}

function Lista({ open }: { open: ReturnType<typeof useOpenAlerts> }) {
  const { state } = useFaro();
  return (
    <main className="flex flex-col gap-[18px] px-8 pt-8 pb-7">
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Alertas abiertas</h1>
          <p className="text-[14px] text-muted">{open.length} alertas · ordenadas por nivel de atención</p>
        </div>
        <DemoPill />
      </div>
      <div className={`overflow-hidden ${card}`}>
        {open.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">No hay alertas abiertas.</p>}
        {open.map((r, i) => (
          <Link
            key={r.p.id}
            to={`/alertas/${r.p.id}`}
            className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-hairline-soft' : ''} ${r.level === 3 ? 'bg-l3-bg' : 'hover:bg-surface-soft'}`}
          >
            <div className="flex w-[160px] shrink-0 flex-col">
              <span className="text-[15px] font-semibold text-ink">{r.p.nombre}</span>
              <span className="text-[12px] text-muted">
                {r.p.edad} · {r.p.comuna}
              </span>
            </div>
            <div className="w-[190px] shrink-0">
              <LevelBadge level={r.level as 0 | 1 | 2 | 3} />
            </div>
            <p className="min-w-0 flex-1 text-[13px] leading-[19px] text-body line-clamp-2">{r.explicacion}</p>
            <span className="w-[100px] shrink-0 text-[13px] text-body">{ESTADO[state.byId[r.p.id]?.estadoRevision ?? r.p.estadoRevision]}</span>
            <span className="shrink-0 text-[13px] font-semibold text-ink">Revisar alerta</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Detalle({ id }: { id: string }) {
  const { state } = useFaro();
  const { open } = useActions();
  const p = useMemo(() => getPersonas().find((x) => x.id === id), [id]);
  const alertas = useOpenAlerts();
  if (!p) {
    return (
      <main className="p-8">
        <p>Alerta no encontrada.</p>
        <Link to="/alertas" className="underline">
          Volver a alertas
        </Link>
      </main>
    );
  }
  const ps = state.byId[p.id];
  const level = nivelDe(p);
  const info = alertas.find((a) => a.p.id === id);
  const controles = p.historialControles;
  const last = controles.at(-1);
  const prev = [...controles].reverse().find((c) => c.nivelResultante !== last?.nivelResultante);
  const evidencias = [...p.senales].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4);
  const cambio =
    last && prev
      ? `Pasó de nivel ${NIVEL_TO_LEVEL[prev.nivelResultante]} (${fechaCorta(prev.fecha)}) a nivel ${NIVEL_TO_LEVEL[last.nivelResultante]} (${fechaCorta(last.fecha)}).`
      : last
        ? `Nivel ${NIVEL_TO_LEVEL[last.nivelResultante]} desde la llamada del ${fechaCorta(last.fecha)}.`
        : '—';

  return (
    <main className="flex flex-col gap-[18px] px-8 py-6">
      <div className="flex items-center">
        <p className="text-[13px] text-muted">
          <Link to="/alertas" className="hover:underline">
            Alertas
          </Link>{' '}
          / Revisión de alerta · {p.nombre}
        </p>
        <div className="flex-1" />
        <DemoPill />
      </div>

      {level === 3 && (
        <div className="rounded-[14px] bg-l3-bg px-5 py-4 text-l3-fg">
          <p className="text-[15px] font-bold">Situación urgente: seguir el protocolo</p>
          <p className="mt-1 text-[13px] leading-[19px]">
            Contactar a {p.nombre} o a su contacto de confianza ahora y registrar el resultado. Activación simulada del protocolo: no se realizan llamadas reales.
          </p>
        </div>
      )}

      <section className={`flex items-center gap-4 p-5 ${card}`}>
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[22px] font-bold text-ink">
            {p.nombre} · {p.edad} años · {p.comuna}
          </h1>
          <p className="text-[13px] text-muted">
            Responsable: {ps?.responsable ? primerNombre(ps.responsable) : 'Sin asignar'} · Revisión: {ESTADO[ps?.estadoRevision ?? p.estadoRevision]}
          </p>
        </div>
        <LevelBadge level={level} />
      </section>

      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section className={`flex flex-col gap-2 p-5 ${card}`}>
            <h2 className="text-[16px] font-semibold text-ink">Qué cambió</h2>
            <p className="text-[14px] leading-[21px] text-body">{cambio}</p>
            {info && <p className="text-[13px] leading-[19px] text-muted">{info.explicacion}</p>}
          </section>
          <section className={`flex flex-col gap-3 p-5 ${card}`}>
            <h2 className="text-[16px] font-semibold text-ink">Evidencia</h2>
            {evidencias.length === 0 && <p className="text-[13px] text-muted">—</p>}
            {evidencias.map((s, i) => (
              <div key={i} className="rounded-lg bg-surface-soft p-3">
                <p className="text-[13px] leading-[19px] text-body">«{s.descripcion.slice(s.descripcion.indexOf(': ') + 2)}»</p>
                <p className="mt-1 text-[11px] text-muted">
                  Fuente: llamada simulada · {fechaCorta(s.fecha)} · {s.dominio.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </section>
        </div>

        <section className={`flex w-[340px] shrink-0 flex-col gap-3 p-5 ${card}`}>
          <h2 className="text-[16px] font-semibold text-ink">Decisión</h2>
          <p className="text-[13px] leading-[19px] text-body">Acción sugerida: {info?.accion ?? '—'}</p>
          <p className="text-[12px] text-muted">Cada acción queda registrada con tu nombre, la fecha y una nota.</p>
          {!ps?.responsable && (
            <button type="button" onClick={() => open('asignar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">
              Asignarme
            </button>
          )}
          <button type="button" onClick={() => open('llamada', p.id)} className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">
            Registrar llamada
          </button>
          <button type="button" onClick={() => open('derivar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">
            Derivar
          </button>
          <button type="button" onClick={() => open('cerrar', p.id)} className="rounded-full border border-ink px-5 py-2.5 text-[14px] font-semibold text-ink">
            Cerrar con resultado
          </button>
          {ps && ps.acciones[0] && (
            <p className="border-t border-hairline-soft pt-3 text-[12px] text-muted">
              Última acción: {ps.acciones[0].autor}, {fechaHora(ps.acciones[0].fecha)}
            </p>
          )}
          <Link to={`/personas/${p.id}`} className="text-[13px] text-muted underline">
            Ver ficha completa
          </Link>
        </section>
      </div>
    </main>
  );
}
