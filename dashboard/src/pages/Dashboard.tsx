import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LevelBadge, { type LevelKey } from '../components/ui/LevelBadge';
import DemoPill from '../components/ui/DemoPill';
import ApiBoundary from '../components/ui/ApiBoundary';
import { useActions } from '../components/actions/ActionModals';
import { DerivacionChip } from '../components/actions/Decisiones';
import { useCountUp } from '../lib/motion';
import { useApi } from '../lib/useApi';
import { CURRENT_USER, diasEntre, fechaCorta, fechaLarga, getBandeja, primerNombre, type BandejaRow } from '../lib/panelApi';

type FilterKey = 'accion' | 'todos' | 'sinResp' | 'sinEval' | 'mis';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'accion', label: 'Requieren acción hoy' },
  { key: 'todos', label: 'Todos los niveles' },
  { key: 'sinResp', label: 'Sin responsable' },
  { key: 'sinEval', label: 'Sin evaluación actual' },
  { key: 'mis', label: 'Mis personas' },
];

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';

interface Row {
  p: BandejaRow;
  level: LevelKey;
  motivo: string;
  responsable: string | null;
  diasSin: number;
}

function buildRow(p: BandejaRow, hoy: string): Row {
  const level: LevelKey = p.nivel === null ? 'na' : p.nivel;
  const ul = p.ultima_llamada;
  return {
    p,
    level,
    motivo: p.motivo ?? (level === 'na' ? 'Sin evaluación actual: aún no hay una llamada válida.' : '—'),
    responsable: p.responsable ? primerNombre(p.responsable) : null,
    diasSin: ul ? diasEntre(ul.fecha, hoy) : 0,
  };
}

const priority = (r: Row) => (r.level === 'na' ? 2 : r.level) * 10 + (r.level === 'na' ? 5 : 0) + r.diasSin + r.p.alertas_abiertas * 0.1;

function Counter({ n, caption, level, dashed, accent }: { n: number; caption: string; level: LevelKey; dashed?: boolean; accent?: boolean }) {
  const shown = useCountUp(n);
  return (
    <div className={`flex flex-1 min-w-0 flex-col gap-2 p-4 ${card} ${dashed ? 'border-dashed border-muted' : ''}`}>
      <div className="flex items-end gap-2.5">
        <span className={`text-[32px] font-bold leading-none tabular-nums ${accent ? 'text-l3-fg' : 'text-ink'}`}>{shown}</span>
        <span className="flex-1 text-[12px] leading-4 text-muted">{caption}</span>
      </div>
      <LevelBadge level={level} className="self-start" />
    </div>
  );
}

function Action({ row }: { row: Row }) {
  const { open } = useActions();
  const nav = useNavigate();
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  if (row.level === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          nav(`/personas/${row.p.id}`);
        }}
        className="inline-flex rounded-full border border-hairline bg-canvas px-[18px] py-[9px] text-[13px] font-semibold whitespace-nowrap text-ink"
      >
        Ver ficha
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          open('transcripcion', row.p.id);
        }}
        className="inline-flex rounded-full bg-ink px-[18px] py-[9px] text-[13px] font-semibold whitespace-nowrap text-white"
      >
        Revisar
      </button>
      {!row.responsable && (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            open('asignar', row.p.id);
          }}
          className="inline-flex rounded-full border border-ink bg-canvas px-4 py-[9px] text-[13px] font-semibold whitespace-nowrap text-ink"
        >
          Asignarme
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const api = useApi(getBandeja, []);
  return (
    <main className="flex flex-col gap-[22px] px-8 pt-8 pb-7">
      <ApiBoundary state={api}>{(b) => <Hoy personas={b.personas} hoy={b.hoy} />}</ApiBoundary>
    </main>
  );
}

function Hoy({ personas, hoy }: { personas: BandejaRow[]; hoy: string }) {
  const [filter, setFilter] = useState<FilterKey>('todos');
  const rows = personas.map((p) => buildRow(p, hoy)).sort((a, b) => priority(b) - priority(a));

  const count = (l: LevelKey) => rows.filter((r) => r.level === l).length;
  const visible = rows.filter((r) => {
    if (filter === 'accion') return r.level === 3 || r.level === 2 || r.level === 'na';
    if (filter === 'sinResp') return !r.responsable;
    if (filter === 'sinEval') return r.level === 'na';
    if (filter === 'mis') return r.responsable === primerNombre(CURRENT_USER);
    return true;
  });

  const cap = (n: number, text: string, zero: string) => (n === 0 ? zero : text);

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Hoy</h1>
          <p className="text-[14px] text-muted">
            {fechaLarga(hoy)} · {rows.length} personas en seguimiento · Llamadas automáticas (sin intervención del operador)
          </p>
        </div>
        <DemoPill />
      </div>

      <div className="anim-stagger flex gap-4">
        <Counter n={count(3)} caption={cap(count(3), 'requiere acción ahora', 'sin personas')} level={3} accent={count(3) > 0} />
        <Counter n={count(2)} caption={cap(count(2), 'revisar hoy', 'sin personas')} level={2} />
        <Counter n={count(1)} caption="sin personas" level={1} />
        <Counter n={count(0)} caption="sin cambios" level={0} />
        <Counter n={count('na')} caption="sin llamada válida" level="na" dashed />
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
          <span className="w-[150px] shrink-0">Última llamada automática</span>
          <span className="w-[90px] shrink-0">Responsable</span>
          <span className="min-w-0 flex-1">Acción</span>
        </div>
        {visible.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">Sin personas para este filtro.</p>}
        {visible.map((r, i) => (
          <Link
            key={r.p.id}
            to={`/personas/${r.p.id}`}
            className={`row-link flex items-center gap-4 px-5 py-[22px] ${i > 0 ? 'border-t border-hairline-soft' : ''} ${
              r.level === 3 ? 'anim-ring-l3-inset bg-l3-bg' : 'bg-canvas'
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
              <span className="text-[13px] text-body">{r.p.ultima_llamada ? fechaCorta(r.p.ultima_llamada.fecha) : '—'}</span>
              <span className="text-[12px] text-muted">
                {!r.p.ultima_llamada ? 'Sin llamadas' : r.p.ultima_llamada.estado === 'completada' || r.p.ultima_llamada.estado === 'parcial' ? (r.diasSin === 0 ? `Llamada ${r.p.ultima_llamada.estado}` : `Hace ${r.diasSin} ${r.diasSin === 1 ? 'día' : 'días'}`) : `Sin respuesta (${r.p.ultima_llamada.estado.replace(/_/g, ' ')})`}
              </span>
            </div>
            <span className={`w-[90px] shrink-0 text-[13px] ${r.responsable ? 'text-body' : 'font-semibold text-ink'}`}>
              {r.responsable ?? 'Sin asignar'}
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
              <Action row={r} />
              {r.p.derivacion && r.p.estado_revision === 'derivado' && <DerivacionChip d={r.p.derivacion} />}
            </div>
            <span className="row-chevron shrink-0 text-muted" aria-hidden>›</span>
          </Link>
        ))}
      </div>

      <p className="text-[12px] leading-[17px] text-muted">
        La falta de respuesta no se interpreta como tristeza, abandono de tratamiento ni emergencia: queda visible aquí para seguimiento
        humano. Niveles calculados por reglas explícitas; el sistema orienta, no diagnostica.
      </p>
    </>
  );
}
