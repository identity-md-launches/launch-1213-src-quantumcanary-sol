import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { formatEther, formatUnits } from 'viem';
import type { Config } from './config';
import type { Sample } from './useCanary';

export function Arrow() { return <span aria-hidden="true">↗</span>; }
export function Copy({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [message, setMessage] = useState('');
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(timer); }, [message]);
  return <span className="copy-control"><button className="button small" onClick={async () => { try { await navigator.clipboard.writeText(value); setMessage('Copied'); } catch { setMessage('Copy unavailable. Select the value manually.'); } }} aria-label={label}>{message === 'Copied' ? 'Copied ✓' : label}</button><span className={message && message !== 'Copied' ? 'copy-error' : 'sr-only'} role="status">{message}</span></span>;
}
export function AddressValue({ value, config, label = 'Copy address' }: { value: string; config: Config; label?: string }) {
  return <div className="address-row"><a className="address" href={`${config.manifest.network.explorer}/address/${value}`} target="_blank" rel="noreferrer">{value} <Arrow /></a><Copy value={value} label={label} /></div>;
}
export function QR({ address, chainId }: { address: string; chainId: number }) {
  const [url, setUrl] = useState('');
  useEffect(() => { void QRCode.toDataURL(`ethereum:${address}@${chainId}`, { margin: 4, width: 180, errorCorrectionLevel: 'M', color: { dark: '#0b100d', light: '#ffffff' } }).then(setUrl); }, [address, chainId]);
  return url ? <img className="qr" src={url} width="144" height="144" alt={`Ethereum mainnet payment QR for canary ${address}. No amount is prefilled.`} /> : <span>Preparing payment QR…</span>;
}
export function amount(value: bigint, decimals = 18, places = 5) {
  const [whole, fraction = ''] = formatUnits(value, decimals).split('.');
  const formatted = BigInt(whole).toLocaleString('en-US');
  const tail = fraction.slice(0, places).replace(/0+$/, '');
  return value > 0n && whole === '0' && !tail ? `<0.${'0'.repeat(places - 1)}1` : `${formatted}${tail ? '.' + tail : ''}`;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return <div className="field"><dt>{label}</dt><dd>{children}{hint && <div className="field-hint">{hint}</div>}</dd></div>;
}
export function Seismograph({ samples, threshold, unavailable }: { samples: Sample[]; threshold?: bigint; unavailable: boolean }) {
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<Sample[]>([]);
  const points = paused ? frozen : samples;
  const max = points.reduce((m, s) => s.balance > m ? s.balance : m, threshold || 1n);
  const y = (value: bigint) => 210 - Number(value * 17000n / (max || 1n)) / 100;
  const xy = points.map((s, i) => ({ x: points.length === 1 ? 30 : 30 + i / (points.length - 1) * 940, y: y(s.balance) }));
  const path = xy.map((p, i) => i === 0 ? `M${p.x},${p.y}` : `H${p.x} V${p.y}`).join(' ');
  return <div className={`seismograph ${paused ? 'paused' : ''}`}>
    <div className="chart-heading"><span>ETH / balance seismograph</span><button className="text-button" onClick={() => { setFrozen(samples); setPaused(!paused); }}>{paused ? 'Resume trace' : 'Pause trace'}</button></div>
    <svg viewBox="0 0 1000 250" role="img" aria-label={unavailable ? 'Balance trace unavailable until a live observation is received.' : `Session balance trace: ${points.length} observed blocks. Latest ${points.length ? formatEther(points.at(-1)!.balance) : 'unknown'} ETH. No historical data is implied.`}>
      <defs><pattern id="grid" width="50" height="42" patternUnits="userSpaceOnUse"><path d="M50 0H0V42" fill="none" className="chart-grid" /></pattern></defs>
      <rect width="1000" height="250" fill="url(#grid)" />
      {threshold !== undefined && <g><path d={`M0,${y(threshold)} H1000`} className="threshold-line" /><text x="980" y={y(threshold) - 10} textAnchor="end" className="chart-label">{amount(threshold)} ETH THRESHOLD</text></g>}
      {xy.length > 0 && <><path d={path} className="trace-glow" /><path d={path} className="trace" /><circle cx={xy.at(-1)!.x} cy={xy.at(-1)!.y} r="5" className="trace-dot" /></>}
      {xy.length === 0 && <text x="500" y="142" textAnchor="middle" className="chart-label">WAITING FOR AN OBSERVATION</text>}
    </svg>
    <div className="chart-caption"><span>{paused ? 'Trace paused · reads continue' : 'Observed blocks · this session only'}</span><span>{points.length} sample{points.length === 1 ? '' : 's'}{points.length > 0 ? ` / #${points.at(-1)!.block}` : ''}</span></div>
    {points.length > 0 && <details className="trace-table"><summary>Read observed balance values</summary><div className="table-wrap"><table><thead><tr><th>Block</th><th>Time (UTC)</th><th>ETH</th></tr></thead><tbody>{points.map(p => <tr key={String(p.block)}><td>{String(p.block)}</td><td>{new Date(Number(p.timestamp) * 1000).toISOString().slice(11, 19)}</td><td>{formatEther(p.balance)}</td></tr>)}</tbody></table></div></details>}
  </div>;
}
