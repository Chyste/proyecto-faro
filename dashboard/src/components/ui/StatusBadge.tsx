import type { NivelSeguimiento, EstadoRevision } from '../../data/types';

const nivelConfig: Record<NivelSeguimiento, { label: string; className: string }> = {
  estable: {
    label: 'Estable',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  preventivo: {
    label: 'Preventivo',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  prioritario: {
    label: 'Prioritario',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  urgente: {
    label: 'Urgente',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
};

const estadoConfig: Record<EstadoRevision, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  },
  en_revision: {
    label: 'En revisión',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  revisado: {
    label: 'Revisado',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  derivado: {
    label: 'Derivado',
    className: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  },
};

interface NivelBadgeProps {
  nivel: NivelSeguimiento;
  size?: 'sm' | 'md';
}

export function NivelBadge({ nivel, size = 'sm' }: NivelBadgeProps) {
  const config = nivelConfig[nivel];
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${config.className} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          nivel === 'estable'
            ? 'bg-emerald-500'
            : nivel === 'preventivo'
            ? 'bg-amber-500'
            : nivel === 'prioritario'
            ? 'bg-orange-500'
            : 'bg-red-500'
        }`}
      />
      {config.label}
    </span>
  );
}

interface EstadoBadgeProps {
  estado: EstadoRevision;
  size?: 'sm' | 'md';
}

export function EstadoBadge({ estado, size = 'sm' }: EstadoBadgeProps) {
  const config = estadoConfig[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${config.className} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      {config.label}
    </span>
  );
}

export function NivelDot({ nivel }: { nivel: NivelSeguimiento }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        nivel === 'estable'
          ? 'bg-emerald-500'
          : nivel === 'preventivo'
          ? 'bg-amber-500'
          : nivel === 'prioritario'
          ? 'bg-orange-500'
          : 'bg-red-500'
      }`}
    />
  );
}

