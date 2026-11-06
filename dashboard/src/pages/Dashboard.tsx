import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPersonas } from '../data/syntheticData';
import type { Persona } from '../data/types';
import LevelBadge, { type LevelKey } from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import { useActions } from '../components/actions/ActionModals';
import { useFaro } from '../state/FaroStore';
import { diasEntre, fechaCorta, fechaHoy, fechaLarga, nivelDe, primerNombre } from '../lib/faro';

type FilterKey = 'accion' | 'todos' | 'sinResp' | 'sinEval' | 'mis';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'accion', label: 'Requieren acción hoy' },
  { key: 'todos', label: 'Todos los niveles' },
  { key: 'sinResp', label: 'Sin responsable' },
  { key: 'sinEval', label: 'Sin evaluación actual' },
  { key: 'mis', label: 'Mis personas' },
];

const CURRENT_USER = 'Camila';
const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';

interface Row {
  p: Persona;
  level: LevelKey;
  motivo: string;
  responsable: string | null;
  diasSin: number;
}

function buildRow(p: Persona, hoy: string, resp: string | null): Row {
  const sinEval = p.fechaUltimoControl < hoy;
  const lastControl = p.historialControles.at(-1);
  const lastSenal = [...p.senales].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  let motivo = '—';
  if (sinEval) motivo = `Sin respuesta hoy. Último nivel conocido: ${nivelDe(p)} (${fechaCorta(p.fechaUltimoControl)})`;
  else if (nivelDe(p) > 0 && lastSenal) motivo = lastSenal.descripcion;
  else if (lastControl) motivo = lastControl.resumen;
  return {
    p,
    level: sinEval ? 'na' : nivelDe(p),
    motivo,
    responsable: resp ? primerNombre(resp) : null,
    diasSin: diasEntre(p.fechaUltimoControl, hoy),
  };
}

const priority = (r: Row) => (r.level === 'na' ? 2 : r.level) * 10 + (r.level === 'na' ? 5 : 0) + r.diasSin;

function Counter({ n, caption, level, dashed, accent }: { n: number; caption: string; level: LevelKey; dashed?: boolean; accent?: boolean }) {
  return (
    <div className={`flex flex-1 min-w-0 flex-col gap-2 p-4 ${card} ${dashed ? 'border-dashed border-muted' : ''}`}>
      <div className="flex items-end gap-2.5">
        <span className={`text-[32px] font-bold leading-none ${accent ? 'text-l3-fg' : 'text-ink'}`}>{n}</span>
        <span className="flex-1 text-[12px] leading-4 text-muted">{caption}</span>
      </div>
      <LevelBadge level={level} className="self-start" />
    </div>
  );
}

function Action({ row }: { row: Row }) {
  const { open } = useActions();
  if (row.level === 3 || row.level === 2 || row.level === 'na') {
    const primary = row.level === 3;
    const asignar = !row.responsable;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open(asignar ? 'asignar' : 'llamada', row.p.id);
        }}
        className={`inline-flex rounded-full px-[18px] py-[9px] text-[13px] font-semibold whitespace-nowrap ${
          primary ? 'bg-ink text-white' : 'border border-ink bg-canvas text-ink'
        }`}
      >
        {asignar ? 'Asignarme' : 'Registrar llamada'}
      </button>
    );
  }
  return <span className="text-[12px] leading-4 text-muted">Llamada automática de seguimiento</span>;
}

export default function Dashboard() {
  const [filter, setFilter] = useState<FilterKey>('todos');
  const personas = useMemo(() => getPersonas(), []);
  const hoy = useMemo(() => fechaHoy(personas), [personas]);
  const { state } = useFaro();
  const rows = useMemo(
    () => personas.map((p) => buildRow(p, hoy, state.byId[p.id]?.responsable ?? null)).sort((a, b) => priority(b) - priority(a)),
    [personas, hoy, state],
  );

  const count = (l: LevelKey) => rows.filter((r) => r.level === l).length;
  const visible = rows.filter((r) => {
    if (filter === 'accion') return r.level === 3 || r.level === 2 || r.level === 'na';
    if (filter === 'sinResp') return !r.responsable;
    if (filter === 'sinEval') return r.level === 'na';
    if (filter === 'mis') return r.responsable === CURRENT_USER;
    return true;
  });

  const cap = (n: number, text: string, zero: string) => (n === 0 ? zero : text);

  return (
    <main className="flex flex-col gap-[22px] px-8 pt-8 pb-7">
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Hoy</h1>
          <p className="text-[14px] text-muted">
            {fechaLarga(hoy)} · {rows.length} personas en seguimiento · Llamadas simuladas de hoy
          </p>
        </div>
        <DemoPill />
      </div>

      <div className="flex gap-4">
        <Counter n={count(3)} caption={cap(count(3), 'requiere acción ahora', 'sin personas')} level={3} accent={count(3) > 0} />
        <Counter n={count(2)} caption={cap(count(2), 'revisar hoy', 'sin personas')} level={2} />
        <Counter n={count(1)} caption="sin personas" level={1} />
        <Counter n={count(0)} caption="sin cambios" level={0} />
        <Counter n={count('na')} caption="sin llamada válida hoy" level="na" dashed />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-2 text-[14px] font-medium ${
              filter === f.key ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink hover:bg-surface-soft'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-muted">Ordenado por prioridad: nivel y tiempo sin atención</span>
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className="flex items-center gap-4 bg-surface-soft px-5 py-3 text-[12px] font-medium text-muted">
          <span className="w-[160px] shrink-0">Persona</span>
          <span className="w-[190px] shrink-0">Nivel de atención</span>
          <span className="w-[230px] shrink-0">Motivo principal</span>
          <span className="w-[150px] shrink-0">Última conversación útil</span>
          <span className="w-[90px] shrink-0">Responsable</span>
          <span className="min-w-0 flex-1">Próxima acción</span>
        </div>
        {visible.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">Sin personas para este filtro.</p>}
        {visible.map((r, i) => (
          <Link
            key={r.p.id}
            to={`/personas/${r.p.id}`}
            className={`flex items-center gap-4 px-5 py-[22px] ${i > 0 ? 'border-t border-hairline-soft' : ''} ${
              r.level === 3 ? 'bg-l3-bg' : 'bg-canvas hover:bg-surface-soft'
            }`}
          >
            <div className="flex w-[160px] shrink-0 flex-col gap-[3px]">
              <span className="text-[15px] font-semibold text-ink">{r.p.nombre}</span>
              <span className="text-[12px] text-muted">
                {r.p.edad} · {r.p.comuna}
              </span>
            </div>
            <div className="w-[190px] shrink-0">
              <LevelBadge level={r.level} />
            </div>
            <p className="w-[230px] shrink-0 text-[13px] leading-[19px] text-body line-clamp-3">{r.motivo}</p>
            <div className="flex w-[150px] shrink-0 flex-col gap-[3px]">
              <span className="text-[13px] text-body">{fechaCorta(r.p.fechaUltimoControl)}</span>
              <span className="text-[12px] text-muted">
                {r.diasSin === 0 ? 'Llamada completada' : `Hace ${r.diasSin} ${r.diasSin === 1 ? 'día' : 'días'}`}
              </span>
            </div>
            <span className={`w-[90px] shrink-0 text-[13px] ${r.responsable ? 'text-body' : 'font-semibold text-ink'}`}>
              {r.responsable ?? 'Sin asignar'}
            </span>
            <div className="min-w-0 flex-1">
              <Action row={r} />
            </div>
          </Link>
        ))}
      </div>

      <p className="text-[12px] leading-[17px] text-muted">
        La falta de respuesta no se interpreta como tristeza, abandono de tratamiento ni emergencia: queda visible aquí para seguimiento
        humano. Niveles calculados por reglas explícitas; el sistema orienta, no diagnostica.
      </p>
    </main>
  );
}
