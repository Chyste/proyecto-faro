import { useCallback, useEffect, useRef, useState } from 'react';
import { suscribirPanel } from './panelApi';

export interface ApiState<T> { data: T | null; error: string | null; loading: boolean; refetch: () => void }

/** Fetch with loading/error states; refetches silently (no skeleton flash) on panel SSE events. personaId narrows which events apply. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[], opts: { personaId?: number } = {}): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const run = useCallback((silent: boolean) => {
    const my = ++seq.current;
    if (!silent) setLoading(true);
    fetchRef.current()
      .then((d) => { if (my === seq.current) { setData(d); setError(null); } })
      .catch((e: Error) => { if (my === seq.current) setError(e.message); })
      .finally(() => { if (my === seq.current) setLoading(false); });
  }, []);

  useEffect(() => { run(false); return () => { seq.current++; }; }, [run, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const pid = opts.personaId;
  useEffect(() => {
    let timer: number | undefined;
    const off = suscribirPanel((ev, d) => {
      if (pid !== undefined && d.persona_id !== undefined && d.persona_id !== pid && ev !== 'demo_reiniciada') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => run(true), 150);
    });
    return () => { window.clearTimeout(timer); off(); };
  }, [run, pid]);

  return { data, error, loading, refetch: () => run(true) };
}
