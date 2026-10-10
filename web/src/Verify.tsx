import { useCallback, useEffect, useRef, useState } from 'react';
import type { Snapshot } from './chain';
import { errorMessage } from './chain';
import { derive, hex32, P, EXPONENT, type Derivation } from './derive';
import { Copy } from './components';
import { site, type Config } from './config';
import { useReducedMotion } from './Seismograph';
import { publicKey } from './public-key';
import { Construction, VerifyWithAI } from './VerificationGuide';

type Line = { text: string; compare?: boolean; match?: boolean };
export function derivationTranscript(s: Snapshot, result: Derivation): Line[] {
  const rows: Line[] = [];
  const print = (text: string) => rows.push({ text });
  const compare = (label: string, computed: string, chain: string) => {
    print(`  local   ${computed}`); print(`  chain   ${chain}`);
    rows.push({ text: `${computed.toLowerCase() === chain.toLowerCase() ? 'OK' : 'MISMATCH'}  ${label}`, compare: true, match: computed.toLowerCase() === chain.toLowerCase() });
  };
  print('$ canary verify --from-sentence --compare-chain');
  print(`read block       ${s.block}`);
  print(`seed author      ${site.seedAuthor}`);
  print(`seedPhrase       "${s.seedPhrase}"`);
  print('01 / keccak256(UTF-8 seedPhrase); no trimming or normalization');
  print(`seedHash         ${result.seedHash}`);
  compare('seedHash()', result.seedHash, s.seedHash);
  print('02 / first valid secp256k1 point, starting counter at zero');
  print(`p                ${hex32(P)}`);
  print(`sqrt exponent    ${hex32(EXPONENT)}`);
  for (const a of result.attempts) {
    print(`counter          ${a.i}`);
    print(`abi.encode       ${a.encoded}`);
    print(`keccak256        ${a.digest}`);
    print(`candidate x      ${hex32(a.x)}`);
    print(`rhs (x³ + 7) % p ${hex32(a.rhs)}`);
    print(`candidate y      ${hex32(a.candidateY)}`);
    print(`y² mod p         ${hex32(a.square)}`);
    print(`residue check    ${a.accepted ? 'ACCEPT / y² = rhs; first valid point' : 'REJECT / increment counter'}`);
  }
  compare('counter()', String(result.counter), String(s.counter));
  compare('pubKeyX()', hex32(result.x), hex32(s.pubKeyX));
  const candidate = result.attempts.at(-1)!.candidateY;
  print('03 / choose the even root');
  print(`parity fix       ${candidate % 2n ? `odd → p − y = ${hex32(result.y)}` : `even → keep y = ${hex32(result.y)}`}`);
  compare('pubKeyY()', hex32(result.y), hex32(s.pubKeyY));
  print('04 / hash the 64-byte public point; take the last 20 bytes');
  print(`x || y           ${result.packed}`);
  print(`keccak256(x||y)  ${result.digest}`);
  print(`address          ${result.address}`);
  print(`uncompressed key ${publicKey(result.x, result.y).uncompressed}`);
  compare('canaryAddress()', result.address, s.canaryAddress);
  print('private key      ████████ never generated');
  print('$ exit');
  return rows;
}
export function Verify({ config, snapshot, stale, readError, active }: { config?: Config; snapshot?: Snapshot; stale: boolean; readError: string; active: boolean }) {
  const reduced = useReducedMotion();
  const [session, setSession] = useState<{ lines: Line[]; snapshot: Snapshot; phrase: string }>();
  const [shown, setShown] = useState(0);
  const [error, setError] = useState('');
  const started = useRef(false);
  const run = useCallback(() => {
    if (!snapshot) return;
    setError('');
    try {
      const result = derive(snapshot.seedPhrase);
      const lines = derivationTranscript(snapshot, result);
      setSession({ lines, snapshot, phrase: snapshot.seedPhrase }); setShown(reduced ? lines.length : 1);
    } catch (e) { setSession(undefined); setError(errorMessage(e)); }
  }, [snapshot, reduced]);
  useEffect(() => { if (active && snapshot && !started.current) { started.current = true; run(); } }, [active, snapshot, run]);
  useEffect(() => {
    if (!session || shown >= session.lines.length || !active) return;
    if (reduced) { setShown(session.lines.length); return; }
    const timer = setInterval(() => setShown(n => Math.min(n + 1, session.lines.length)), 65);
    return () => clearInterval(timer);
  }, [session, shown, reduced, active]);
  const complete = !!session && shown >= session.lines.length;
  const checks = session?.lines.filter(l => l.compare) || [];
  const matches = checks.filter(l => l.match).length;
  const changed = !!session && !!snapshot && ['seedPhrase', 'seedHash', 'counter', 'pubKeyX', 'pubKeyY', 'canaryAddress'].some(key => session.snapshot[key as keyof Snapshot] !== snapshot[key as keyof Snapshot]);
  return <>
    <div className="page-intro"><h1>Don’t trust.<br />Recompute.</h1><p className="reading">A sentence. A hash. A point on secp256k1. An address. Run the same construction here, in your browser, and compare every result with Ethereum. No wallet. No secret input.</p></div>
    <Construction snapshot={snapshot} stale={stale} readError={readError} />
    <section className="numbered-section" aria-labelledby="verify-title"><h2 id="verify-title"><span>02</span> Open a terminal.</h2><div className="terminal">
      <div className="terminal-heading"><span>quantum-canary / local derivation</span><button className="button" onClick={run} disabled={!snapshot || (!!session && !complete)}>{session && !complete ? 'Running…' : '$ run again'}</button></div>
      {(stale || readError) && <p className="notice">The chain observation is not current. Results below compare against the recorded block. Restore fresh reads before relying on them.</p>}
      {changed && <p className="notice">On-chain derivation values changed since this run. Run again to compare the current observation.</p>}
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="terminal-output" aria-label="Derivation transcript" aria-busy={!!session && !complete}>
        {!session && <p>Waiting for the seed and getters from Ethereum.<span className="cursor" aria-hidden="true">█</span></p>}
        {session?.lines.slice(0, shown).map((line, i) => <div key={i} className={`terminal-line ${line.compare ? `comparison ${line.match ? 'match' : 'mismatch'}` : ''}`}><span className="line-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><code>{line.text}</code></div>)}
        {!!session && !complete && <span className="cursor" aria-hidden="true">█</span>}
      </div>
      <div className="verification-result" role="status">{complete ? `${matches === 5 ? 'OK' : 'MISMATCH'} / ${matches} of 5 on-chain comparisons match at block ${session.snapshot.block}.${stale || readError || changed ? ' Current verification required.' : ''}` : session ? 'Computing and printing the derivation…' : 'Waiting for Ethereum.'}</div>
      {complete && <div className="terminal-footer"><Copy value={session.lines.map(l => l.text).join('\n')} label="Copy transcript" /><span>Exact inputs. Native JavaScript BigInt. Keccak-256.</span></div>}
    </div></section>
    <VerifyWithAI config={config} snapshot={snapshot} stale={stale} readError={readError} />
    <section className="numbered-section" aria-labelledby="seed-title"><h2 id="seed-title"><span>04</span> The sentence is public.</h2><blockquote className="seed-quote">{snapshot?.seedPhrase || 'Reading seedPhrase()…'}</blockquote><p>Author: {site.seedAuthor}. The agent building the observer chose it; the requester did not.</p><p className="reading">An ordinary wallet begins with a secret scalar and computes a public point. This construction begins with the point. A corresponding private key exists mathematically, but nobody generated it. The sentence is not a wallet recovery phrase.</p></section>
    <section className="numbered-section" aria-labelledby="assumptions-title"><h2 id="assumptions-title"><span>05</span> Know what the proof proves.</h2><div className="reading-columns"><p>This verifies the construction and its agreement with the on-chain getters. Finding the private key still requires solving the elliptic-curve discrete logarithm problem under the standard secp256k1 and Keccak assumptions.</p><p>A sufficiently capable quantum computer could solve it and sign a transfer. A classical breakthrough, address-preimage attack, or a failure of Ethereum’s rules could also break the assumptions. The balance cannot tell you which happened.</p><p>The alarm has a threshold, not a detector for every wei spent. Someone must poke to arm it. A drain and refill between observations can be missed. <a href="#integrate">A permanent response needs your own latch.</a></p></div></section>
  </>;
}
