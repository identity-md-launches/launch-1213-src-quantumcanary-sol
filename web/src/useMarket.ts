import { useEffect, useState } from 'react';
import { pricing, publicClient, site, type Config, type Injected } from './config';
import { readMarketSnapshot, type MarketSnapshot } from './market-chain';

export function useMarket(config?: Config, provider?: Injected) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot>();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!config) return;
    let alive = true;
    let busy = false;
    const client = publicClient(config, provider);
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try { const value = await readMarketSnapshot(config, client); if (alive) setSnapshot(value); }
      catch { if (alive) setSnapshot(undefined); }
      finally { busy = false; if (alive) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, pricing.pollMs);
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { alive = false; clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', visible); };
  }, [config, provider]);
  // Never keep stale dollar context after a failed read or a sleeping tab.
  const current = snapshot && now - snapshot.fetchedAt <= site.staleMs && now / 1_000 - Number(snapshot.blockTime) <= 180;
  return { market: current ? snapshot : undefined, loading };
}
