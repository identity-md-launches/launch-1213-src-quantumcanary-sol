import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { formatUnits } from 'viem';
import type { Config } from './config';

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
