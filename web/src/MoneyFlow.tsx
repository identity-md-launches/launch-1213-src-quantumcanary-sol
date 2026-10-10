import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeEventLog, encodeFunctionData, formatEther, type Hash } from 'viem';
import { community, hookAbi, publicClient, site, type Config } from './config';
import { checkedWallet, type Wallet } from './wallet';
import { errorMessage, readSnapshot, type Snapshot } from './chain';
import { readFundSnapshot, type FundSnapshot } from './fund-chain';
import { AddressValue, Arrow, Field, amount } from './components';

type Payment = { phase: 'idle' | 'preparing' | 'signing' | 'confirming' | 'uncertain' | 'success' | 'error'; message: string; hash?: Hash };
export function MoneyFlow({ config, wallet, snapshot, stale, readError, refreshCanary }: {
  config: Config; wallet: Wallet; snapshot?: Snapshot; stale: boolean; readError: string; refreshCanary: () => Promise<void>;
}) {
  const [fund, setFund] = useState<FundSnapshot>();
  const [fundError, setFundError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment>({ phase: 'idle', message: '' });
  const reading = useRef(false);
  const paying = useRef(false);
  const alive = useRef(true);
  const provider = wallet.account && !wallet.wrongChain ? wallet.provider : undefined;
  const refresh = useCallback(async () => {
    if (reading.current) return;
    reading.current = true; setLoading(true);
    try { const next = await readFundSnapshot(config, publicClient(config, provider)); if (alive.current) { setFund(next); setFundError(''); } }
    catch (e) { if (alive.current) setFundError(errorMessage(e)); }
    finally { reading.current = false; if (alive.current) setLoading(false); }
  }, [config, provider]);
  useEffect(() => {
    alive.current = true; void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { alive.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  const fundStale = !!fund && (Date.now() - fund.fetchedAt > site.staleMs || Date.now() / 1000 - Number(fund.blockTime) > 180);
  const busy = ['preparing', 'signing', 'confirming', 'uncertain'].includes(payment.phase);
  const ready = !!fund && !fundStale && !fundError && !fund.retired && fund.accruedFees > 0n && !!snapshot?.verified && !snapshot.isTripped && !stale && !readError && !!wallet.account && !wallet.wrongChain;
  const confirm = async (hash: Hash) => {
    let observedHash = hash;
    setPayment({ phase: 'confirming', hash, message: 'Payout submitted. Waiting for an Ethereum confirmation…' });
    try {
      const client = publicClient(config, provider);
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000, onReplaced: replacement => {
        observedHash = replacement.transaction.hash;
        setPayment({ phase: 'confirming', hash: observedHash, message: 'Transaction replaced. Checking the confirmed action…' });
      } });
      observedHash = receipt.transactionHash;
      const transaction = await client.getTransaction({ hash: observedHash });
      const intended = transaction.to?.toLowerCase() === community.hook.toLowerCase() && transaction.value === 0n && transaction.input === encodeFunctionData({ abi: hookAbi, functionName: 'payout' });
      if (receipt.status === 'reverted') setPayment({ phase: 'error', hash: observedHash, message: 'Payout reverted. No bounty was paid; network gas may have been spent.' });
      else if (!intended) setPayment({ phase: 'error', hash: observedHash, message: 'A different transaction confirmed. Inspect the replacement before trying payout again.' });
      else {
        let paid = 0n;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== community.hook.toLowerCase()) continue;
          try { const event = decodeEventLog({ abi: hookAbi, eventName: 'BountyPaid', data: log.data, topics: log.topics }); if (event.args.destination.toLowerCase() === community.canary.toLowerCase()) paid += event.args.ethAmount; } catch { /* Other hook events are not payments. */ }
        }
        setPayment({ phase: 'success', hash: observedHash, message: paid ? `Payout confirmed: ${formatEther(paid)} ETH paid to the canary. Refreshing the fund ledger.` : 'Payout confirmed; no BountyPaid event was emitted. Nothing was paid in this transaction. Refreshing pending fees.' });
      }
      await Promise.all([refresh(), refreshCanary()]);
    } catch { setPayment({ phase: 'uncertain', hash: observedHash, message: 'Payout confirmation unavailable. It may still be pending. Check confirmation before sending another request.' }); }
  };
  const payout = async () => {
    if (!ready || busy || paying.current) return;
    paying.current = true; setPayment({ phase: 'preparing', message: 'Checking the alarm, hook recipients and current pending ETH…' });
    try {
      const client = publicClient(config, provider);
      const [fresh, hook] = await Promise.all([readSnapshot(config, client), readFundSnapshot(config, client)]);
      if (!fresh.verified || fresh.isTripped || hook.retired || fresh.canaryAddress.toLowerCase() !== community.canary.toLowerCase()) throw Error('The alarm or hook no longer permits a safe payout. Refresh and inspect the state.');
      if (Date.now() / 1000 - Number(fresh.blockTime) > 180 || Date.now() / 1000 - Number(hook.blockTime) > 180) throw Error('Chain observation is stale. Retry reads before payout.');
      if (!hook.accruedFees) throw Error('No pending ETH remains. Another caller may already have paid it out.');
      const simulation = await client.simulateContract({ address: community.hook, abi: hookAbi, functionName: 'payout', account: wallet.account! });
      if (!simulation.result) throw Error('Simulation would pay no ETH. No transaction requested. Refresh pending fees.');
      const signer = await checkedWallet(config, wallet);
      setPayment({ phase: 'signing', message: `Confirm payout() in your wallet. Up to ${formatEther(hook.accruedFees)} pending ETH goes to the canary; you pay only network gas and receive no reward.` });
      const hash = await signer.writeContract({ address: community.hook, abi: hookAbi, functionName: 'payout' });
      await confirm(hash);
    } catch (e) { setPayment({ phase: 'error', message: errorMessage(e) }); }
    finally { paying.current = false; }
  };
  return <section id="money" className="money-section numbered-section" aria-labelledby="money-title" tabIndex={-1}>
    <h2 id="money-title"><span>04</span> Where every wei goes.</h2>
    <div className="money-intro"><p className="money-thesis">The canary has no token.<br />It needs none.</p><div className="reading"><p><strong>CANARY is an optional community fund.</strong> Its only job is to grow the ETH bounty. Buying CANARY is speculative. This project does not need you to buy it.</p><p>Sending ETH straight to the canary does the same thing with <strong>zero fees</strong> to the hook or pool. You still pay Ethereum network gas. <a href="#fund">Send directly →</a></p></div></div>
    <h3>One swap. Two separate fees.</h3>
    <div className="flow-route" aria-label="Hook fee payment route"><span>Trader’s ETH</span><span aria-hidden="true">→</span><span>1% hook fee</span><span aria-hidden="true">→</span><span>PoolManager claims</span><span aria-hidden="true">→</span><span>Canary bounty</span></div>
    <p id="fee-table-help" className="table-scroll-hint">Scroll sideways to follow each fee →</p>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Swap fee flow" aria-describedby="fee-table-help"><table className="flow-table"><caption>ETH / CANARY on Uniswap v4 — launch 1235</caption><thead><tr><th scope="col">Flow</th><th scope="col">Rate &amp; currency</th><th scope="col">Where it ends</th><th scope="col">Who can move it</th></tr></thead><tbody>
      <tr><th scope="row">1. Hook fee</th><td>Flat 1% of the ETH side, on buys and sells. Always ETH.</td><td>100% to the canary address. No other recipient.</td><td>Automatic payout attempted after each swap; anyone can call <code>payout()</code>.</td></tr>
      <tr><th scope="row">2. Pool LP fee</th><td>1.25% of input reaching the pool. ETH on a buy; CANARY on a sell.</td><td>Pool liquidity position → 80% to the launch payer, 20% to IMD.</td><td>The ownerless IMD launch factory owns the position. Anyone can trigger its <code>claimFees()</code>.</td></tr>
    </tbody></table></div>
    <div className="reading-columns money-explanation"><p>The hook fee first accrues as ERC-6909 ETH claims held by the hook inside the PoolManager. A payout redeems those claims and pushes ETH to the canary. The hook has no owner, no withdraw function, no fee setter, and no other recipient.</p><p>The hook reads <code>isTripped()</code> before every fee and every payout. It permanently stops collecting new fees at the first trip it observes. Already-accrued claims are different: the published hook source still permits their payout after retirement. This site disables payout once tripped or retired.<sup><a href="#retirement-note" aria-label="Read retirement caveat, footnote 2">[2]</a></sup></p><p>The pool’s 1.25% fee is separate. The factory’s fixed 80/20 split means 1% of pool input volume goes to the wallet that paid for this launch, and 0.25% goes to the IMD protocol. <strong>That trader-paid 1% is the only money anyone involved earns from CANARY. It is never paid by the canary.</strong></p></div>
    <div className="worked-example"><h3>Work it through: 1 ETH.</h3><div className="example-row"><strong>BUY</strong><div><p>At the headline rates, a 1 ETH buy is illustrated as <strong>0.01 ETH to the canary</strong> and 0.0125 ETH of fees to the LP position: 0.01 ETH to the requester wallet and 0.0025 ETH to IMD. That illustration leaves 0.9775 ETH to buy CANARY.</p><p className="fine">Fee illustration using 1 ETH as the basis for both quoted rates. Execution applies the pool fee to the input reaching the pool after the hook: on a fully filled 1 ETH exact-input buy, that is 0.012375 ETH of LP fees (0.0099 / 0.002475 split), leaving 0.977625 ETH for the swap. Rounding, price impact and network gas are separate.</p></div></div><div className="example-row"><strong>SELL</strong><p>A sell of CANARY worth 1 ETH gross sends <strong>0.01 ETH to the canary</strong>, leaving 0.99 ETH gross output to the seller. The LP position also receives <strong>1.25% of the CANARY input</strong>, split 80/20 by the factory in that currency. It is not a second ETH payment.</p></div></div>
    <h3>The supply has already gone out.</h3><dl className="distribution"><div><dt>90%</dt><dd>900,000,000 CANARY in pool liquidity, locked forever. The factory has no remove-liquidity function.</dd></div><div><dt>10%</dt><dd>100,000,000 CANARY went to the swarm workers who built and audited the launch.</dd></div><div><dt>0%</dt><dd>To the person who requested it. Nothing reserved for a team: there is no team.</dd></div></dl>
    <section className="fund-ledger" aria-labelledby="ledger-title"><div className="section-heading"><h3 id="ledger-title">Read the fund ledger.</h3><button className="text-button" onClick={() => void refresh()} disabled={loading}>{loading ? 'Reading fund…' : 'Refresh fund reads'}</button></div><p className="fine">{fund ? `Observed block ${fund.block} · public reads every 30 seconds.` : 'Reading the hook and its payment events from Ethereum.'}{fundStale || fundError ? ' Last-known values; payout disabled.' : ''}</p>
      {fundError && <p className="notice" role="alert">{fundError}</p>}{fundStale && <p className="notice">Fund observation is stale. Retry fund reads.</p>}
      <dl className="ledger-values"><Field label="ETH pending" hint="accruedFees() · ERC-6909 claims">{fund ? `${amount(fund.accruedFees, 18, 8)} ETH` : '—'}</Field><Field label="Hook retired" hint="retired() · permanent once true">{fund ? String(fund.retired) : '—'}</Field><Field label="Total ETH paid to canary" hint={fund?.paidError || 'Sum of all BountyPaid events'}>{fund?.paid !== undefined ? `${amount(fund.paid, 18, 8)} ETH` : 'Unavailable'}</Field><Field label="Canary balance" hint="Native ETH · all funding sources">{snapshot ? `${amount(snapshot.balance, 18, 8)} ETH` : '—'}</Field></dl>
      <p className="reading">Run <code>payout()</code> to push pending ETH claims to the canary. Anyone can call it. The destination is fixed. You receive nothing and pay network gas; no token approval is needed.</p>
      {!wallet.account ? <button className="button" onClick={wallet.connect} disabled={wallet.busy}>{wallet.busy ? 'Connecting wallet…' : 'Connect wallet to payout'}</button> : wallet.wrongChain ? <p>Use “Switch to Ethereum” in the funding controls before payout.</p> : <button className="button" onClick={() => void payout()} disabled={!ready || busy}>{busy ? 'Payout pending…' : '$ payout()'}</button>}
      {fund?.retired ? <p className="fine">Hook retired. This site will not request a payout to the compromised address.</p> : snapshot?.isTripped ? <p className="fine">The live alarm is tripped. Payout is disabled.</p> : fund?.accruedFees === 0n ? <p className="fine">No ETH pending. The next swap may create new claims.</p> : (!snapshot?.verified || stale || readError) ? <p className="fine">Fresh, verified canary reads are required for payout.</p> : null}
      <div role="status" className="tx-status">{payment.message && <p>{payment.message}</p>}{payment.hash && <a href={`${config.manifest.network.explorer}/tx/${payment.hash}`} target="_blank" rel="noreferrer">Inspect payout transaction <Arrow /></a>}{payment.phase === 'uncertain' && <button className="button" onClick={() => { if (payment.hash) void confirm(payment.hash); }}>Check payout confirmation</button>}</div>
      <details><summary>Exact fund values and history boundary</summary><p className="break">Pending: {fund ? `${fund.accruedFees} wei` : 'unavailable'}<br />Paid: {fund?.paid !== undefined ? `${fund.paid} wei` : 'unavailable'}</p><p className="reading">The total is a complete event sum from block {String(community.eventsFromBlock)} to {fund ? String(fund.block) : 'the observed block'}. The reader checks that the hook had no code at the starting block. It never substitutes the current balance or a partial log range for lifetime payouts.</p></details>
    </section>
    <details className="fund-contracts"><summary>Inspect fund contracts, pool and fixed parameters</summary><p>QuantumCanaryToken · “Quantum Canary” (CANARY) · 18 decimals · fixed supply 1,000,000,000. Plain ERC-20. No mint. No owner.</p><AddressValue value={community.token} config={config} label="Copy CANARY token address" /><p>QuantumCanaryHook · optional community fund</p><AddressValue value={community.hook} config={config} label="Copy hook address" /><p>Canary bounty destination</p><AddressValue value={community.canary} config={config} label="Copy fund destination" /><p>PoolManager · from the supplied Ethereum network configuration</p><AddressValue value={config.manifest.network.uniswapV4.poolManager} config={config} label="Copy PoolManager address" /><p className="break">ETH/CANARY poolId: {community.poolId}<br />LP fee: {community.lpFee} = 1.25% · tick spacing: {community.tickSpacing}</p></details>
    <p className="fund-links"><a href={community.launch} target="_blank" rel="noreferrer">Launch 1235 on imd.fun <Arrow /></a><a href={`${config.manifest.network.explorer}/address/${community.hook}#code`} target="_blank" rel="noreferrer">Hook on Etherscan <Arrow /></a><a href={`${config.manifest.network.explorer}/token/${community.token}`} target="_blank" rel="noreferrer">Token on Etherscan <Arrow /></a><a href={`${config.manifest.network.explorer}/address/${config.contract.address}#code`} target="_blank" rel="noreferrer">Canary observer / launch 1213 <Arrow /></a></p>
    <p id="retirement-note" className="fine" tabIndex={-1}>[2] Retirement requires a transaction that observes the live trip. A third party can refill the address before that observation. Also, the <a href={community.source} target="_blank" rel="noreferrer">published hook source</a> permits payment of previously accrued claims after retirement. Retirement therefore does not guarantee that pending ETH can never reach a compromised address. This frontend blocks those payouts; it cannot change the deployed contract. <a href="#integrate">Read the integration caveat.</a></p>
  </section>;
}
