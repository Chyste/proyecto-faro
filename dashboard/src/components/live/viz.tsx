// Tiny dependency-free SVG visualizations for the live call screen.
import { seconds } from './liveModel';

export function Ring({ value, total, size = 40, stroke = 4, className = '' }:
  { value: number; total: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = total ? Math.min(value / total, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`${value} de ${total}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ev-ring-track" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ev-ring-bar" strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - f)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="ev-ring-text">{value}/{total}</text>
    </svg>
  );
}

export interface Segment { label: string; value: number; cls: string }

export function Donut({ segments, centerTop, centerBottom, size = 112 }:
  { segments: Segment[]; centerTop: string; centerBottom: string; size?: number }) {
  const stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ev-ring-track" strokeWidth={stroke} fill="none" />
      {segments.filter((s) => s.value > 0).map((s) => {
        const len = (s.value / total) * c, off = acc;
        acc += len;
        return <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={`ev-seg ${s.cls}`}
          strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
      })}
      <text x="50%" y="46%" textAnchor="middle" className="ev-donut-top">{centerTop}</text>
      <text x="50%" y="64%" textAnchor="middle" className="ev-donut-bottom">{centerBottom}</text>
    </svg>
  );
}

export function Gauge({ value }: { value: number | null }) {
  const w = 120, r = 46, cx = 60, cy = 58, len = Math.PI * r, f = value ?? 0;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg width={w} height={72} viewBox="0 0 120 72" role="img" aria-label={`Confianza media ${value === null ? 'sin datos' : Math.round(f * 100) + '%'}`}>
      <path d={d} className="ev-ring-track" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={d} className="ev-ring-bar" strokeWidth="10" fill="none" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - f)} />
      <text x="60" y="56" textAnchor="middle" className="ev-donut-top">{value === null ? '—' : `${Math.round(f * 100)}%`}</text>
    </svg>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const w = 132, h = 40, pad = 3;
  if (values.length < 2) {
    return <div className="ev-spark-empty" title={values.length ? seconds(values[0]) : undefined}>{values.length ? seconds(values[0]) : '—'}</div>;
  }
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [pad + (i * (w - 2 * pad)) / (values.length - 1), h - pad - (v / max) * (h - 2 * pad)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Latencia por turno">
      <path d={line} fill="none" className="ev-spark-line" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" className="ev-spark-dot"><title>{`Turno ${i + 1}: ${seconds(values[i])}`}</title></circle>)}
    </svg>
  );
}

export function Waveform({ label = 'Escuchando…' }: { label?: string }) {
  return (
    <div className="ev-listening" aria-live="polite">
      <span className="ev-wave" aria-hidden>{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</span>
      <span>{label}</span>
    </div>
  );
}
