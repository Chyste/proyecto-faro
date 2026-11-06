import { X } from 'lucide-react';
import type { NivelSeguimiento } from '../../data/types';

interface FilterBarProps {
  show: boolean;
  regionFilter: string;
  comunaFilter: string;
  nivelFilter: NivelSeguimiento | '';
  periodoFilter: string;
  regiones: string[];
  comunas: string[];
  onRegionChange: (v: string) => void;
  onComunaChange: (v: string) => void;
  onNivelChange: (v: NivelSeguimiento | '') => void;
  onPeriodoChange: (v: string) => void;
  onClear: () => void;
}

const periodos = [
  { value: '', label: 'Todo el período' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
];

export default function FilterBar({
  show,
  regionFilter,
  comunaFilter,
  nivelFilter,
  periodoFilter,
  regiones,
  comunas,
  onRegionChange,
  onComunaChange,
  onNivelChange,
  onPeriodoChange,
  onClear,
}: FilterBarProps) {
  if (!show) return null;

  const hasFilters = regionFilter || comunaFilter || nivelFilter || periodoFilter;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 animate-in slide-in-from-top">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={regionFilter}
          onChange={(e) => onRegionChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-primary-300 outline-none"
        >
          <option value="">Todas las regiones</option>
          {regiones.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={comunaFilter}
          onChange={(e) => onComunaChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-primary-300 outline-none"
        >
          <option value="">Todas las comunas</option>
          {comunas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={nivelFilter}
          onChange={(e) => onNivelChange(e.target.value as NivelSeguimiento | '')}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-primary-300 outline-none"
        >
          <option value="">Todos los niveles</option>
          <option value="estable">Estable</option>
          <option value="preventivo">Preventivo</option>
          <option value="prioritario">Prioritario</option>
          <option value="urgente">Urgente</option>
        </select>

        <select
          value={periodoFilter}
          onChange={(e) => onPeriodoChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-primary-300 outline-none"
        >
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

