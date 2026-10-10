import { useId } from 'react';
import type { Snapshot } from './chain';
import { Copy } from './components';
import { publicKey } from './public-key';

export function ObservationNote({ snapshot, stale, readError }: { snapshot?: Snapshot; stale: boolean; readError: string }) {
  return <p className="fine">{snapshot
    ? `${stale || readError ? 'Last observed' : 'Read from Ethereum'} at block ${snapshot.block}.${!snapshot.verified ? ' Unverified: the observation failed local checks.' : ''}${stale || readError ? ' Retry reads above for a current observation.' : ''}`
    : 'Waiting for live contract reads. No values are assumed.'}</p>;
}

export function PublicKey({ snapshot, stale, readError, compact = false }: { snapshot?: Snapshot; stale: boolean; readError: string; compact?: boolean }) {
  const id = useId();
  const key = snapshot && publicKey(snapshot.pubKeyX, snapshot.pubKeyY);
  return <section className={`public-key${compact ? ' compact' : ''}`} aria-labelledby={id}>
    <h3 id={id}>Public key</h3>
    <ObservationNote snapshot={snapshot} stale={stale} readError={readError} />
    {key && <dl className="public-key-values">
      <div><dt>Uncompressed · 65 bytes · 04 || x || y</dt><dd><code>{key.uncompressed}</code><Copy value={key.uncompressed} label="Copy uncompressed key" /></dd></div>
      <div><dt>Compressed · 33 bytes · {snapshot!.pubKeyY % 2n === 0n ? '02 / even y' : '03 / odd y'} || x</dt><dd><code>{key.compressed}</code><Copy value={key.compressed} label="Copy compressed key" /></dd></div>
      <div><dt>x · pubKeyX()</dt><dd><code>{key.x}</code></dd></div>
      <div><dt>y · pubKeyY()</dt><dd><code>{key.y}</code></dd></div>
    </dl>}
    <p className="public-key-note">{compact ? 'Public on purpose. No private key was ever generated.' : 'The public key is public on purpose. A quantum attack needs exactly this point and nothing else. There is no private key to find anywhere: it was never generated.'}</p>
  </section>;
}
