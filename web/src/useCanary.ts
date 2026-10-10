import { useCallback, useEffect, useRef, useState } from 'react';
import { publicClient, site, type Config, type Injected } from './config';
import { readSnapshot, errorMessage, type Snapshot } from './chain';
export type Sample = { block: bigint; timestamp: bigint; balance: bigint };

export function useCanary(config: Config | undefined, provider?: Injected) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    if (!config || busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const next = await readSnapshot(config, publicClient(config, provider));
      if (!mounted.current) return;
      setSnapshot(next); setError('');
      setSamples(old => [...old.filter(s => s.block < next.block), { block: next.block, timestamp: next.blockTime, balance: next.balance }].slice(-120));
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, [config, provider]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, site.pollMs);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { mounted.current = false; clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  const stale = !!snapshot && (now - snapshot.fetchedAt > site.staleMs || now / 1000 - Number(snapshot.blockTime) > 180);
  return { snapshot, samples, error, loading, stale, refresh, now };
}
