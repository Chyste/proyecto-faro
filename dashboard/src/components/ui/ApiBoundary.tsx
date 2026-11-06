import type { ReactNode } from 'react';
import type { ApiState } from '../../lib/useApi';

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[64px] animate-pulse rounded-[14px] bg-surface-strong" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function ErrorCard({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[14px] border border-hairline bg-surface-soft p-5">
      <p className="text-[15px] font-semibold text-ink">No se pudo conectar con FARO (API en :8000)</p>
      <p className="text-[13px] text-body">Levanta la API con <code>uv run uvicorn src.api.app:app --port 8000</code> y vuelve a intentar.</p>
      {message && <p className="text-[12px] text-muted">Detalle: {message}</p>}
      {onRetry && <button type="button" onClick={onRetry} className="self-start rounded-full border border-ink px-4 py-2 text-[13px] font-semibold text-ink">Reintentar</button>}
    </div>
  );
}

/** Renders skeleton while first loading, an error card on failure, else children with data. */
export default function ApiBoundary<T>({ state, rows, children }: { state: ApiState<T>; rows?: number; children: (data: T) => ReactNode }) {
  if (state.data) return <>{children(state.data)}</>;
  if (state.error) return <ErrorCard message={state.error} onRetry={state.refetch} />;
  return <Skeleton rows={rows} />;
}
