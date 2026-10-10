import { useEffect, useRef, useState } from 'react';
import { formatEther, formatUnits } from 'viem';
import { loadConfig, site, community, type Config } from './config';
import { alarmState, errorMessage, type Snapshot } from './chain';
import { useCanary } from './useCanary';
import { useWallet } from './wallet';
import { AddressValue, Arrow, Copy, Field, amount } from './components';
import { Seismograph } from './Seismograph';
import { Actions } from './Actions';
import { Verify } from './Verify';
import { Integrate } from './Integrate';
import { MoneyFlow } from './MoneyFlow';

type Route = 'status' | 'verify' | 'integrate';
const routeFromHash = (): Route => location.hash === '#verify' ? 'verify' : location.hash === '#integrate' ? 'integrate' : 'status';
function SignalBanner({ snapshot, stale, error }: { snapshot?: Snapshot; stale: boolean; error: string }) {
  const state = snapshot ? alarmState(snapshot) : '';
  const unavailable = !snapshot || stale || !!error || !snapshot.verified;
  const label = !snapshot ? error ? 'SIGNAL UNAVAILABLE' : 'READING THE SIGNAL' : unavailable ? 'OBSERVATION NOT CURRENT' : state;
  const description = !snapshot ? 'Connecting to Ethereum. No alarm state is assumed until the reads complete.' : snapshot.verificationError || (unavailable ? `Last observed: ${state}. Retry reads for a verified live signal.` : state === 'TRIPPED' ? 'Balance below threshold after arming. Investigate on chain. Call poke() to record this observation.' : state === 'AWAITING POKE' ? 'The bounty has reached the threshold. Call poke() to record the balance and arm the alarm.' : state === 'NOT YET FUNDED' ? 'The observed high-water mark is below threshold. Fund the address, then poke to arm.' : 'Armed. The live balance remains at or above the threshold.');
  return <div className={`signal-banner ${unavailable ? 'unknown' : state === 'TRIPPED' ? 'tripped' : 'armed'}`} role="status"><span className="signal-icon" aria-hidden="true">{state === 'TRIPPED' && !unavailable ? '[!]' : '[·]'}</span><div><h2>{label}</h2><p>{description}</p></div>{state === 'TRIPPED' && !unavailable && <img className="trip-sticker" src="./art/sticker.png" alt="Quantum Canary alarm sticker" width="112" height="112" />}</div>;
}
export function App() {
  const [config, setConfig] = useState<Config>();
  const [configError, setConfigError] = useState('');
  const [route, setRoute] = useState<Route>(routeFromHash);
  const main = useRef<HTMLElement>(null);
  const wallet = useWallet(config);
  const { snapshot, samples, error, loading, stale, refresh } = useCanary(config, wallet.account && !wallet.wrongChain ? wallet.provider : undefined);
  const init = async () => { setConfigError(''); try { setConfig(await loadConfig()); } catch (e) { setConfigError(errorMessage(e)); } };
  useEffect(() => { void init(); }, []);
  useEffect(() => {
    const change = () => {
      if (location.hash === '#main') { main.current?.focus(); return; }
      setRoute(routeFromHash());
      requestAnimationFrame(() => {
        const target = ['#fund', '#watch', '#money', '#signal-limits', '#retirement-note'].includes(location.hash) ? document.querySelector<HTMLElement>(location.hash) : null;
        if (target) { target.scrollIntoView({ behavior: 'instant' }); target.focus({ preventScroll: true }); }
        else { window.scrollTo({ top: 0, behavior: 'instant' }); main.current?.focus({ preventScroll: true }); }
      });
    };
    window.addEventListener('hashchange', change);
    if (['#fund', '#watch', '#money', '#signal-limits', '#retirement-note'].includes(location.hash)) requestAnimationFrame(change);
    return () => window.removeEventListener('hashchange', change);
  }, [config]);
  useEffect(() => { document.title = `${route[0].toUpperCase() + route.slice(1)} — Quantum Canary`; }, [route]);
  const current = !!snapshot?.verified && !stale && !error;
  const tripped = current && !!snapshot?.isTripped;
  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Skip to content</a>
    <div className="document-shell">
      <header className="site-header">
        <a className="brand" href="#status" aria-label="Quantum Canary home"><img className="ink-art" src="./art/ink/logo.png" alt="" width="48" height="48" /><span>QUANTUM<br />CANARY<span className="cursor" aria-hidden="true">█</span></span></a>
        <nav aria-label="Main navigation">{(['status', 'verify', 'integrate'] as const).map(r => <a key={r} href={`#${r}`} aria-current={route === r ? 'page' : undefined}>{r[0].toUpperCase() + r.slice(1)}</a>)}<a href="#money">Money flow</a></nav>
        <span className="network-label">Ethereum<br />chain {config?.manifest.chainId ?? '…'} / mainnet</span>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {configError && <div className="notice" role="alert"><strong>Deployment could not load.</strong><p>{configError}</p><button className="button" onClick={() => void init()}>Retry configuration</button></div>}
        {(error || stale) && <div className="notice" role="alert"><strong>{stale ? 'Observation is stale.' : 'Live reads unavailable.'}</strong><p>{error || 'No recent Ethereum observation. Last-known values are shown; transactions are disabled.'}</p><button className="button" disabled={loading} onClick={() => void refresh()}>{loading ? 'Retrying reads…' : 'Retry reads'}</button></div>}
        <section hidden={route !== 'status'} aria-label="Status page">
          <div className="hero">
            <span className="margin-type" aria-hidden="true">TRUST NO KEY</span>
            {snapshot && <pre className="hex-texture" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => `${i.toString(16).padStart(4, '0')}  ${snapshot.seedHash.slice(2).match(/.{1,4}/g)?.join(' ')}`).join('\n')}</pre>}
            <h1>A public <span className="alarm-word">alarm</span> for the day a quantum computer breaks Ethereum.</h1>
            <div className="hero-body reading-columns"><p>Quantum Canary is an Ethereum address nobody controls. Its public key was derived on chain from a sentence chosen at random by an agent of the imd.fun swarm, so no private key was ever generated.</p><p>Under today’s cryptographic assumptions, moving its ETH means breaking secp256k1. If the balance drops below the threshold after arming, the alarm trips. Every contract watching <code>isTripped()</code> can see that Ethereum signatures may no longer be safe.<sup><a href="#signal-limits" aria-label="Read signal limits, footnote 1">[1]</a></sup></p></div>
            <div className="command-row" aria-label="Canary commands"><a href="#fund"><strong><span aria-hidden="true">$ </span>fund</strong><span>Send ETH. First public goal: 1 ETH.<br /> Bigger bounty, louder alarm.</span></a><a href="#watch"><strong><span aria-hidden="true">$ </span>watch</strong><span>Read the live balance<br /> and the alarm state.</span></a><a href="#integrate"><strong><span aria-hidden="true">$ </span>wire-in</strong><span>Put the signal<br /> inside your contract.</span></a></div>
          </div>
          <section id="watch" className="monitor numbered-section" tabIndex={-1} aria-labelledby="monitor-title">
            <div className="section-heading"><h2 id="monitor-title"><span>01</span> Listen for the break.</h2><button className="text-button" disabled={loading || !config} onClick={() => void refresh()}>{loading ? 'Reading…' : 'Refresh ↻'}</button></div>
            <div className="balance-header"><div><span>canary.balance</span><div className="balance-value">{snapshot ? amount(snapshot.balance, 18, 6) : '—'} <span>ETH</span></div></div><div className="balance-meta"><span>{current ? '● VERIFIED OBSERVATION' : '○ UNVERIFIED / WAITING'}</span><p className="fine">{snapshot ? `Block ${snapshot.block.toLocaleString('en-US')}\n${new Date(Number(snapshot.blockTime) * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}` : 'No balance is assumed.'}<br />Public reads every 12 seconds.</p></div></div>
            <Seismograph samples={samples} threshold={snapshot?.thresholdWei} tripped={tripped} current={current} active={route === 'status'} />
            <SignalBanner snapshot={snapshot} stale={stale} error={error} />
            <dl className="metrics"><Field label="Arming threshold" hint="thresholdWei()">{snapshot ? `${formatEther(snapshot.thresholdWei)} ETH` : '—'}</Field><Field label="Observed high-water mark" hint="highWaterMark()">{snapshot ? `${amount(snapshot.highWaterMark)} ETH` : '—'}</Field><Field label="Live alarm" hint="isTripped() · can clear on refill">{snapshot ? String(snapshot.isTripped) : '—'}</Field><Field label="Quantum-locked IMD" hint={snapshot?.imdError || 'Same unknown key. ETH alarm only.'}>{snapshot?.imdBalance !== undefined ? `${amount(snapshot.imdBalance, config?.manifest.network.pairToken.decimals)} IMD` : '—'}</Field></dl>
            <details className="chain-details"><summary>Inspect exact values &amp; first recorded trip</summary><dl><Field label="Exact ETH balance">{snapshot ? `${formatEther(snapshot.balance)} ETH / ${snapshot.balance} wei` : '—'}</Field><Field label="Exact threshold">{snapshot ? `${snapshot.thresholdWei} wei` : '—'}</Field><Field label="Exact high-water mark">{snapshot ? `${snapshot.highWaterMark} wei` : '—'}</Field><Field label="trippedAt()">{snapshot ? `${snapshot.trippedAt} ${snapshot.trippedAt ? '· ' + new Date(Number(snapshot.trippedAt) * 1000).toISOString() : '· No trip recorded'}` : '—'}</Field><Field label="trippedBlock()">{snapshot ? snapshot.trippedBlock ? <a href={`${config?.manifest.network.explorer}/block/${snapshot.trippedBlock}`} target="_blank" rel="noreferrer">{String(snapshot.trippedBlock)} <Arrow /></a> : '0 · No trip recorded' : '—'}</Field><Field label="Exact quantum-locked IMD">{snapshot?.imdBalance !== undefined && config ? `${formatUnits(snapshot.imdBalance, config.manifest.network.pairToken.decimals)} IMD / ${snapshot.imdBalance} base units` : 'Unavailable'}</Field></dl><p className="reading">The first trip recorded by <code>poke()</code> stays forever. A refill can clear the live alarm without erasing that record. Zero means no trip was recorded; it does not prove no spending occurred.</p>{config && <><p>IMD token on Ethereum:</p><AddressValue value={config.manifest.network.pairToken.address} config={config} label="Copy IMD address" /></>}</details>
          </section>
          {config && <>
            <div className="wallet-strip"><div>{wallet.account ? <div className="wallet-account"><span className="break">{wallet.account}</span><Copy value={wallet.account} label="Copy wallet address" /><strong>{wallet.wrongChain ? 'Wrong network' : 'Ethereum connected'}</strong></div> : <p>No wallet needed to read. Connect only to send ETH, poke, or pay out pending hook fees.</p>}</div>{wallet.account && <button className="button small" onClick={wallet.disconnect}>Disconnect</button>}</div>
            {wallet.error && <p className="notice" role="alert">{wallet.error}</p>}
            <Actions config={config} wallet={wallet} snapshot={snapshot} stale={stale} readError={error} refresh={refresh} />
            <MoneyFlow config={config} wallet={wallet} snapshot={snapshot} stale={stale} readError={error} refreshCanary={refresh} />
          </>}
          <section className="statement numbered-section" aria-labelledby="statement-title"><h2 id="statement-title"><span>05</span> The public statement.</h2><div className="statement-body"><p className="pgp-rule">-----BEGIN QUANTUM CANARY STATEMENT-----</p><div className="reading-columns"><p>There is no custodian. There is no recovery desk. A public sentence became a public point on a curve. The secret that could spend from it was never generated.</p><p>The bounty makes a broken assumption worth revealing. The signal belongs to anyone who reads it. The code has no owner, no upgrade switch, and no permission slip.</p><p>Fund it if you want the alarm to be louder. Verify it before you trust it. Wire it into something that matters.</p></div><div className="redacted">private key: <span aria-hidden="true">████████</span><span className="sr-only">redacted block;</span> never generated</div><p className="pgp-rule">-----END QUANTUM CANARY STATEMENT-----</p><p className="fine">Statement format, not a digital signature.</p><img className="statement-art ink-art" src="./art/ink/hero.png" alt="" width="180" height="180" loading="lazy" /></div></section>
          <aside id="signal-limits" className="footnotes" tabIndex={-1}><p><strong>[1] Read the threshold literally.</strong> The deployed contract trips only when <code>balance &lt; thresholdWei &amp;&amp; highWaterMark ≥ thresholdWei</code>. A smaller drop above the threshold does not trip it. A drain and refill between observations can be missed. A refill can clear the live alarm.</p><p>A balance drop signals a broken assumption; it cannot identify the hardware used. Classical cryptographic breakthroughs or Ethereum rule failures are other possibilities. <a href="#verify">Inspect the derivation and its assumptions.</a></p></aside>
        </section>
        <section hidden={route !== 'verify'} aria-label="Verify page"><Verify snapshot={snapshot} stale={stale} readError={error} active={route === 'verify'} /></section>
        <section hidden={route !== 'integrate'} aria-label="Integrate page">{config ? <Integrate config={config} /> : <div className="page-intro"><h1>Loading integration details…</h1></div>}</section>
      </main>
      <footer className="site-footer"><div className="footer-title">QUANTUM CANARY / END OF TRANSMISSION <span className="cursor" aria-hidden="true">█</span></div><nav aria-label="Project links">{config && <a href={`${config.manifest.network.explorer}/address/${config.contract.address}#code`} target="_blank" rel="noreferrer">Observer contract <Arrow /></a>}<a href={site.source} target="_blank" rel="noreferrer">Source on GitHub <Arrow /></a><a href={site.launch} target="_blank" rel="noreferrer">Launch 1213 <Arrow /></a><a href={community.launch} target="_blank" rel="noreferrer">Fund launch 1235 <Arrow /></a></nav><div className="footer-seed"><p>Seed sentence / {snapshot ? 'read from Ethereum' : 'from the contract source'}</p><blockquote>{snapshot?.seedPhrase || site.seedPhrase}</blockquote><p>Author: {site.seedAuthor}. No human chose the sentence.</p></div><p className="fine">secp256k1 / Keccak-256 / Ethereum mainnet.</p></footer>
    </div>
  </>;
}
