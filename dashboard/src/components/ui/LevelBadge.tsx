import { CircleAlert, CircleCheck, CircleDashed, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { Level } from '../../lib/faro';

export type LevelKey = Level | 'na';

const CONFIG = {
  0: { label: 'Seguimiento habitual', Icon: CircleCheck, cls: 'bg-l0-bg text-l0-fg' },
  1: { label: 'Atención preventiva', Icon: CircleAlert, cls: 'bg-l1-bg text-l1-fg' },
  2: { label: 'Revisión prioritaria', Icon: TriangleAlert, cls: 'bg-l2-bg text-l2-fg' },
  3: { label: 'Situación urgente', Icon: OctagonAlert, cls: 'bg-l3-bg text-l3-fg' },
  na: {
    label: 'Sin evaluación actual',
    Icon: CircleDashed,
    cls: 'bg-surface-strong text-muted border border-dashed border-muted',
  },
} as const;

export const levelLabel = (l: LevelKey) => CONFIG[l].label;

/** Level pill: icon + word + color (never color alone). */
export default function LevelBadge({ level, className = '' }: { level: LevelKey; className?: string }) {
  const { label, Icon, cls } = CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-[5px] pl-2.5 pr-3 text-[12px] font-semibold whitespace-nowrap ${cls} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
