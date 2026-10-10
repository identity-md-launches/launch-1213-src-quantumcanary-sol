import { useEffect, useRef, useState } from 'react';
import { formatEther } from 'viem';
import type { Sample } from './useCanary';
import { amount } from './components';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function Seismograph({ samples, threshold, tripped, current, active }: {
  samples: Sample[]; threshold?: bigint; tripped: boolean; current: boolean; active: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const openedAt = useRef(Date.now());
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<{ samples: Sample[]; time: number }>();
  const reduced = useReducedMotion();
  const points = paused && frozen ? frozen.samples : samples;
  const staticTime = paused && frozen ? frozen.time : points.length ? Number(points.at(-1)!.timestamp) * 1000 : openedAt.current;
  useEffect(() => {
    const node = canvas.current;
    if (!node || !active) return;
    const ctx = node.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let previous = 0;
    let width = 0;
    const height = 228;
    const paint = (now: number) => {
      const w = node.getBoundingClientRect().width;
      if (!w) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== width || node.height !== height * dpr) {
        width = w; node.width = Math.round(w * dpr); node.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = tripped ? '#361210' : '#0d1510'; ctx.fillRect(0, 0, w, height);
      const start = now - 300_000;
      const left = 12; const right = w - 42;
      const x = (time: number) => left + (time - start) / 300_000 * (right - left);
      const max = points.reduce((m, p) => p.balance > m ? p.balance : m, threshold || 1n);
      const y = (balance: bigint) => 190 - Number(balance * 14000n / (max || 1n)) / 100;
      ctx.lineWidth = 0.6; ctx.strokeStyle = tripped ? '#653028' : '#27422f';
      ctx.beginPath();
      for (let h = 22; h <= 190; h += 28) { ctx.moveTo(0, h); ctx.lineTo(w, h); }
      for (let t = Math.ceil(start / 15_000) * 15_000; t <= now + 30_000; t += 15_000) { ctx.moveTo(x(t), 0); ctx.lineTo(x(t), height); }
      ctx.stroke();
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = tripped ? '#ffb1a8' : '#a0b5a6';
      for (let t = Math.ceil(start / 60_000) * 60_000; t <= now; t += 60_000) {
        if (x(t) < w - 75) ctx.fillText(new Date(t).toISOString().slice(11, 19), x(t) + 4, 216);
      }
      if (threshold !== undefined) {
        ctx.strokeStyle = '#eee56b'; ctx.setLineDash([5, 5]); ctx.beginPath();
        ctx.moveTo(0, y(threshold)); ctx.lineTo(w, y(threshold)); ctx.stroke(); ctx.setLineDash([]);
        const label = `${amount(threshold)} ETH / THRESHOLD`;
        const labelWidth = ctx.measureText(label).width;
        ctx.fillStyle = tripped ? '#361210' : '#0d1510'; ctx.fillRect(w - labelWidth - 20, y(threshold) - 20, labelWidth + 16, 17);
        ctx.fillStyle = '#eee56b'; ctx.fillText(label, w - labelWidth - 12, y(threshold) - 7);
      }
      if (points.length) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 5, right + 4, 193); ctx.clip();
        ctx.strokeStyle = tripped ? '#ffb1a8' : '#a6edb6'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        // Observed balances are drawn as steps. The held segment ends after
        // one minute if no fresh reading arrives. No pre-session history exists.
        for (let i = 0; i < points.length; i++) {
          const p = points[i]; const px = x(Number(p.timestamp) * 1000); const py = y(p.balance);
          if (!i) ctx.moveTo(px, py);
          else { ctx.lineTo(px, y(points[i - 1].balance)); ctx.lineTo(px, py); }
        }
        const last = points.at(-1)!;
        const endTime = Math.min(now, Number(last.timestamp) * 1000 + 60_000);
        const endX = x(endTime); const endY = y(last.balance);
        ctx.lineTo(endX, endY); ctx.stroke();
        // A visibly separate alarm pen shakes only in the TRIPPED state.
        // Its jagged mark is labelled, never presented as balance samples.
        if (tripped) {
          ctx.beginPath();
          const alarmStart = Math.max(x(Number(last.timestamp) * 1000), endX - 90);
          for (let px = alarmStart; px <= endX; px += 3) {
            const phase = (px - endX) * 0.55 + now / 100;
            const py = Math.max(8, Math.min(193, endY - 35 + Math.sin(phase) * 24 + Math.sin(phase * 2.7) * 13));
            if (px === alarmStart) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.fillStyle = tripped ? '#ffb1a8' : '#a6edb6'; ctx.fillRect(endX - 3, endY - 3, 6, 6); ctx.restore();
      } else {
        ctx.fillStyle = '#a0b5a6'; ctx.fillText('NO OBSERVATIONS YET', 16, 134);
      }
    };
    const tick = (time: number) => {
      if (time - previous >= 40) { paint(Date.now()); previous = time; }
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(frame);
      paint(paused || reduced ? staticTime : Date.now());
      if (!paused && !reduced && current && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(run); resize.observe(node);
    document.addEventListener('visibilitychange', run); run();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', run); };
  }, [points, threshold, paused, reduced, tripped, current, active, staticTime]);
  return <div className={`seismograph ${tripped ? 'alarm-paper' : ''}`}>
    <div className="chart-heading"><span>ETH balance / 5-minute strip / UTC</span><button className="text-button" disabled={reduced} onClick={() => { setFrozen({ samples, time: Date.now() }); setPaused(!paused); }}>{reduced ? 'Static trace · reduced motion' : paused ? 'Resume trace' : 'Pause trace'}</button></div>
    <canvas ref={canvas} role="img" aria-label={`Canary ETH balance strip chart. ${points.length ? `Last observation: ${formatEther(points.at(-1)!.balance)} ETH.` : 'Waiting for the first observation.'} ${threshold ? `Alarm threshold: ${formatEther(threshold)} ETH.` : ''} Exact observations are available in the table below.`} />
    <div className="chart-caption"><span>{paused ? 'Trace paused · reads continue' : !current ? 'Trace held · waiting for verified reads' : 'Pen holds last observation between reads'}</span><span>{points.length} observed block{points.length === 1 ? '' : 's'} / this session only</span></div>
    {tripped && <p className="alarm-caption">TRIPPED. Jagged pen marks the alarm; it does not represent measured balance fluctuations.</p>}
    <details className="trace-table"><summary>Read exact balance observations</summary><p className="fine">No history is invented before you opened this page. The line stops extending after 60 seconds without a new sample.</p><div className="table-wrap" tabIndex={0} role="region" aria-label="Observed balances"><table><thead><tr><th scope="col">Block</th><th scope="col">Time (UTC)</th><th scope="col">ETH</th></tr></thead><tbody>{points.map(p => <tr key={String(p.block)}><td>{String(p.block)}</td><td>{new Date(Number(p.timestamp) * 1000).toISOString().slice(11, 19)}</td><td>{formatEther(p.balance)}</td></tr>)}{!points.length && <tr><td colSpan={3}>Waiting for a verified observation.</td></tr>}</tbody></table></div></details>
  </div>;
}
