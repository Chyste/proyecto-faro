import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LevelBadge, { type LevelKey } from '../components/ui/LevelBadge';
import { DerivacionChip } from '../components/actions/Decisiones';
import DemoPill from '../components/ui/DemoPill';
import ApiBoundary from '../components/ui/ApiBoundary';
import { useApi } from '../lib/useApi';
import { ESTADO_REVISION_LABEL, fechaCorta, getBandeja, primerNombre, proximaTexto, type BandejaRow } from '../lib/panelApi';

const card = 'rounded-[14px] border border-hairline-soft bg-canvas shadow-card';
type SortKey = 'nivel' | 'ultima' | 'nombre';
const CHIPS: { key: LevelKey | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 3, label: 'Urgente' },
  { key: 2, label: 'Prioritario' },
  { key: 1, label: 'Preventivo' },
  { key: 0, label: 'Habitual' },
  { key: 'na', label: 'Sin evaluación actual' },
];

export default function PersonasPage() {
  const api = useApi(getBandeja, []);
  return (
    <main className="flex flex-col gap-[18px] px-8 pt-8 pb-7">
      <ApiBoundary state={api}>{(b) => <Lista personas={b.personas} />}</ApiBoundary>
    </main>
  );
}

function Lista({ personas }: { personas: BandejaRow[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [chip, setChip] = useState<LevelKey | 'todos'>('todos');
  const [resp, setResp] = useState('');
  const [comuna, setComuna] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'nivel', dir: -1 });

  const lvl = (p: BandejaRow): LevelKey => (p.nivel === null ? 'na' : p.nivel);
  const respDe = (p: BandejaRow) => p.responsable;
  const rank = (l: LevelKey) => (l === 'na' ? 2.5 : l);

  const comunas = [...new Set(personas.map((p) => p.comuna ?? '—'))];
  const responsables = [...new Set(personas.map(respDe).filter((r): r is string => !!r))];

  const rows = personas
    .filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => chip === 'todos' || lvl(p) === chip)
    .filter((p) => !resp || (resp === '__none' ? !respDe(p) : respDe(p) === resp))
    .filter((p) => !comuna || p.comuna === comuna)
    .sort((a, b) => {
      const d =
        sort.key === 'nivel'
          ? rank(lvl(a)) - rank(lvl(b))
          : sort.key === 'ultima'
            ? (a.ultima_llamada?.fecha ?? '').localeCompare(b.ultima_llamada?.fecha ?? '')
            : a.nombre.localeCompare(b.nombre);
      return d * sort.dir;
    });

  const count = (l: LevelKey) => personas.filter((p) => lvl(p) === l).length;
  const parts = [`${personas.length} personas`];
  if (count(3)) parts.push(`${count(3)} ${count(3) === 1 ? 'urgente' : 'urgentes'}`);
  if (count(2)) parts.push(`${count(2)} ${count(2) === 1 ? 'prioritaria' : 'prioritarias'}`);
  if (count('na')) parts.push(`${count('na')} sin evaluación actual`);

  const th = (key: SortKey, label: string, w: string) => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'nivel' ? -1 : 1 }))}
      className={`${w} shrink-0 text-left font-medium hover:text-ink`}
      aria-label={`Ordenar por ${label}`}
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : ''}
    </button>
  );
  const sel = 'rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink';

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight text-ink">Personas</h1>
          <p className="text-[14px] text-muted">{parts.join(' · ')}</p>
        </div>
        <DemoPill />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" aria-label="Buscar por nombre" className={`${sel} w-[220px]`} />
        <select value={resp} onChange={(e) => setResp(e.target.value)} className={sel} aria-label="Responsable">
          <option value="">Todos los responsables</option>
          <option value="__none">Sin asignar</option>
          {responsables.map((r) => (
            <option key={r} value={r}>
              {primerNombre(r)}
            </option>
          ))}
        </select>
        <select value={comuna} onChange={(e) => setComuna(e.target.value)} className={sel} aria-label="Comuna">
          <option value="">Todas las comunas</option>
          {comunas.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={String(c.key)}
            onClick={() => setChip(c.key)}
            className={`rounded-full px-4 py-2 text-[14px] font-medium ${chip === c.key ? 'bg-ink text-white' : 'border border-hairline bg-canvas text-ink hover:bg-surface-soft'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <div className="flex min-w-[1180px] items-center gap-4 bg-surface-soft px-5 py-3 text-[12px] text-muted">
          {th('nombre', 'Persona', 'w-[150px]')}
          {th('nivel', 'Nivel de atención', 'w-[190px]')}
          <span className="w-[50px] shrink-0 font-medium">Edad</span>
          <span className="w-[100px] shrink-0 font-medium">Comuna</span>
          <span className="w-[70px] shrink-0 font-medium">Vive sola</span>
          <span className="w-[90px] shrink-0 font-medium">Responsable</span>
          {th('ultima', 'Última conversación', 'w-[130px]')}
          <span className="w-[110px] shrink-0 font-medium">Revisión</span>
          <span className="min-w-0 flex-1 font-medium">Próxima acción</span>
        </div>
        {rows.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">Sin personas para estos filtros.</p>}
        {rows.map((p, i) => {
          const l = lvl(p);
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/personas/${p.id}`)}
              className={`flex min-w-[1180px] cursor-pointer items-center gap-4 px-5 py-4 row-link ${i > 0 ? 'border-t border-hairline-soft' : ''}`}
            >
              <Link to={`/personas/${p.id}`} className="w-[150px] shrink-0 text-[15px] font-semibold text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                {p.nombre}
              </Link>
              <div className="w-[190px] shrink-0">
                <LevelBadge level={l} />
              </div>
              <span className="w-[50px] shrink-0 text-[13px] text-body">{p.edad}</span>
              <span className="w-[100px] shrink-0 text-[13px] text-body">{p.comuna}</span>
              <span className="w-[70px] shrink-0 text-[13px] text-body">{p.vive_sola === 'si' ? 'Sí' : p.vive_sola === 'no' ? 'No' : '—'}</span>
              <span className={`w-[90px] shrink-0 text-[13px] ${p.responsable ? 'text-body' : 'font-semibold text-ink'}`}>
                {p.responsable ? primerNombre(p.responsable) : 'Sin asignar'}
              </span>
              <span className="w-[130px] shrink-0 text-[13px] text-body">{p.ultima_llamada ? fechaCorta(p.ultima_llamada.fecha) : '—'}</span>
              <span className="w-[110px] shrink-0 text-[13px] text-body">{ESTADO_REVISION_LABEL[p.estado_revision]}</span>
              <span className="min-w-0 flex-1 text-[13px] text-body">
                {l === 3 || l === 2 || l === 'na' ? 'Revisar hoy · ' : ''}Próxima llamada automática: {proximaTexto(p.proxima_llamada, p.pausada)}
                {p.derivacion && p.estado_revision === 'derivado' && <span className="mt-1 block"><DerivacionChip d={p.derivacion} /></span>}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
