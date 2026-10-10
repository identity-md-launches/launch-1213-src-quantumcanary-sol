import { useRef, useState } from 'react';
import { encodeFunctionData, formatEther, parseEther, type Hash } from 'viem';
import { publicClient, site, type Config } from './config';
import { checkedWallet, type Wallet } from './wallet';
import { errorMessage, readSnapshot, type Snapshot } from './chain';
import { AddressValue, Arrow, QR, UsdValue } from './components';

type Transaction = { phase: 'idle' | 'preparing' | 'signing' | 'confirming' | 'uncertain' | 'success' | 'error'; message: string; hash?: Hash };
const idle: Transaction = { phase: 'idle', message: '' };
const active = (tx: Transaction) => ['preparing', 'signing', 'confirming', 'uncertain'].includes(tx.phase);

export function validAmount(input: string) {
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(input.trim())) throw Error('Enter a positive ETH amount, with at most 18 decimal places.');
  const value = parseEther(input.trim());
  if (value <= 0n || value >= 2n ** 256n) throw Error('Enter a positive ETH amount within the Ethereum balance range.');
  return value;
}
function TxStatus({ tx, config, check }: { tx: Transaction; config: Config; check: () => void }) {
  return <div className={`tx-status ${tx.phase === 'error' ? 'error-text' : ''}`} role="status">
    {tx.message && <p>{tx.message}</p>}
    {tx.hash && <p><a href={`${config.manifest.network.explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">View transaction on Etherscan <Arrow /></a></p>}
    {tx.phase === 'uncertain' && <button className="button" onClick={check}>Check confirmation</button>}
  </div>;
}
export function Actions({ config, wallet, snapshot, stale, readError, refresh, ethUsd }: { config: Config; ethUsd?: bigint; wallet: Wallet; snapshot?: Snapshot; stale: boolean; readError: string; refresh: () => Promise<void> }) {
  const [input, setInput] = useState('0.01');
  const [inputError, setInputError] = useState('');
  const [review, setReview] = useState<bigint>();
  const [consent, setConsent] = useState(false);
  const [fund, setFund] = useState<Transaction>(idle);
  const [poke, setPoke] = useState<Transaction>(idle);
  const fundLock = useRef(false);
  const pokeLock = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  let inputWei: bigint | undefined;
  try { inputWei = validAmount(input); } catch { /* Invalid input has no USD estimate. */ }
  const ready = !!snapshot?.verified && !stale && !readError && !!wallet.account && !wallet.wrongChain;
  const gate = !snapshot ? 'Waiting for a verified Ethereum observation.' : readError || stale ? 'Fresh Ethereum reads are required before sending. Retry reads above.' : snapshot.verificationError || '';
  const provider = wallet.wrongChain ? undefined : wallet.provider;
  const confirmation = async (kind: 'fund' | 'poke', hash: Hash) => {
    const set = kind === 'fund' ? setFund : setPoke;
    let observedHash = hash;
    set({ phase: 'confirming', hash, message: 'Submitted. Waiting for an Ethereum confirmation…' });
    try {
      const client = publicClient(config, provider);
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000, onReplaced: replacement => {
        observedHash = replacement.transaction.hash;
        set({ phase: 'confirming', hash: observedHash, message: 'The wallet transaction was replaced. Checking what actually confirmed…' });
      } });
      observedHash = receipt.transactionHash;
      const transaction = await client.getTransaction({ hash: observedHash });
      const intended = kind === 'fund'
        ? transaction.to?.toLowerCase() === snapshot?.canaryAddress.toLowerCase() && transaction.value === review && transaction.input === '0x'
        : transaction.to?.toLowerCase() === config.contract.address.toLowerCase() && transaction.value === 0n && transaction.input === encodeFunctionData({ abi: config.abi, functionName: 'poke' });
      if (receipt.status === 'reverted') set({ phase: 'error', hash: observedHash, message: 'Transaction reverted. No requested transfer or observation completed; network gas may have been spent.' });
      else if (!intended) set({ phase: 'error', hash: observedHash, message: 'A different transaction confirmed, possibly a wallet cancellation or replacement. The requested action is not confirmed. Inspect the transaction before trying again.' });
      else {
        set({ phase: 'success', hash: observedHash, message: kind === 'fund' ? 'Bounty transfer confirmed. Refreshing the balance. If the threshold is reached, call poke to record it.' : 'Poke confirmed. Refreshing the observed high-water mark and trip record.' });
        if (kind === 'fund') { setReview(undefined); setConsent(false); }
      }
      await refresh();
    } catch {
      set({ phase: 'uncertain', hash: observedHash, message: 'Confirmation is not available yet. The transaction may still be pending. Check its status before sending anything again.' });
    }
  };
  const execute = async (kind: 'fund' | 'poke') => {
    const set = kind === 'fund' ? setFund : setPoke;
    const lock = kind === 'fund' ? fundLock : pokeLock;
    if (lock.current || active(fund) || active(poke) || !ready) return;
    if (kind === 'fund' && (review === undefined || !consent)) return;
    lock.current = true;
    set({ phase: 'preparing', message: 'Checking current chain state and simulating the action…' });
    try {
      const client = publicClient(config, provider);
      const fresh = await readSnapshot(config, client);
      if (!fresh.verified || Date.now() / 1000 - Number(fresh.blockTime) > 180 || Date.now() - fresh.fetchedAt > site.staleMs) throw Error(fresh.verificationError || 'Chain observation is stale. Retry reads before sending.');
      if (fresh.canaryAddress !== snapshot!.canaryAddress) throw Error('The bounty recipient changed. Reload and verify the address.');
      if (kind === 'fund') {
        const value = review!;
        // Simulate the exact ordinary transfer by estimating it. No observer
        // call, approval, data payload, or contract-held ETH is involved.
        await client.estimateGas({ account: wallet.account!, to: fresh.canaryAddress, value });
        const signer = await checkedWallet(config, wallet);
        set({ phase: 'signing', message: 'Confirm the irreversible ETH transfer in your wallet. The wallet will show the network gas fee.' });
        const hash = await signer.sendTransaction({ to: fresh.canaryAddress, value });
        await confirmation(kind, hash);
      } else {
        await client.simulateContract({ account: wallet.account!, address: config.contract.address, abi: config.abi, functionName: 'poke' });
        const signer = await checkedWallet(config, wallet);
        set({ phase: 'signing', message: 'Confirm poke in your wallet. This records the current observation and costs network gas; it transfers no bounty.' });
        const hash = await signer.writeContract({ address: config.contract.address, abi: config.abi, functionName: 'poke' });
        await confirmation(kind, hash);
      }
    } catch (e) { set({ phase: 'error', message: errorMessage(e) }); }
    finally { lock.current = false; }
  };
  const walletGate = !wallet.account ? <button type="button" className="button primary" disabled={wallet.busy} onClick={wallet.connect}>{wallet.busy ? 'Connecting wallet…' : 'Connect a browser wallet'}</button> : wallet.wrongChain ? <button type="button" className="button primary" disabled={wallet.busy} onClick={wallet.switchNetwork}>{wallet.busy ? 'Switching network…' : 'Switch to Ethereum'}</button> : null;
  return <>
    <section id="fund" className="fund-section numbered-section" tabIndex={-1} aria-labelledby="fund-title">
      <div className="fund-copy"><h2 id="fund-title"><span>02</span> Put ETH on the line.</h2><p>Anyone can send ETH straight to the canary address. No owner. No withdrawal function. No known private key.</p><p>Nobody, including the authors, can move it under today’s cryptographic assumptions. A quantum computer that breaks secp256k1 could recover the key and claim the bounty.</p><p className="warning-note">Bounties are irreversible. There is no refund or recovery path. Send only what you are willing to lock forever.</p><p className="fine">A balance drop is evidence of a broken security assumption, not proof of a particular computer. <a href="#verify">Read the assumptions →</a></p><img className="fund-art ink-art" src="./art/ink/mascot.png" alt="" width="140" height="140" loading="lazy" /></div>
      <div className="fund-panel">
        <h3>Send directly to the canary.</h3><p>No token purchase. No hook fee. No LP fee. Only network gas.</p>
        {snapshot ? <><AddressValue value={snapshot.canaryAddress} config={config} label="Copy bounty address" /><div className="qr-row"><QR address={snapshot.canaryAddress} chainId={config.manifest.chainId} /><p className="fine">Ethereum mainnet only.<br />Scan to send directly.<br />This is the bounty account; the observer contract cannot accept donations.</p></div></> : <p>Reading the bounty address from the contract…</p>}
        <form onSubmit={e => { e.preventDefault(); setInputError(''); try { setReview(validAmount(input)); setConsent(false); } catch (err) { setInputError(errorMessage(err)); inputRef.current?.focus(); } }}>
          <label htmlFor="bounty-amount">Bounty amount <span className="muted">(ETH)</span></label>
          <div className="amount-input"><input ref={inputRef} id="bounty-amount" name="bounty-amount" type="text" inputMode="decimal" autoComplete="off" value={input} aria-invalid={!!inputError} aria-describedby="amount-context amount-error" disabled={active(fund) || active(poke)} onChange={e => { setInput(e.target.value); setReview(undefined); setInputError(''); }} /><span>ETH</span></div>
          <p id="amount-context" className="fine"><UsdValue wei={inputWei} ethUsd={ethUsd} />Plus Ethereum network gas.</p>
          <p id="amount-error" className="error-text" role="status">{inputError}</p>
          {walletGate || <button className={`button${review === undefined ? ' primary' : ''}`} type="submit" disabled={!ready || active(fund) || active(poke)}>{active(fund) ? 'Bounty transfer pending…' : 'Review bounty transfer'} <span aria-hidden="true">→</span></button>}
        </form>
        {gate && <p className="fine warning-text">{gate}</p>}
        {review !== undefined && wallet.account && !wallet.wrongChain && <div className="transfer-review">
          <h3>Review irreversible transfer</h3><p>Send <strong>{formatEther(review)} ETH</strong> <UsdValue wei={review} ethUsd={ethUsd} /> on Ethereum mainnet to:</p><code className="break">{snapshot?.canaryAddress}</code>
          <label className="checkbox"><input type="checkbox" checked={consent} disabled={active(fund)} onChange={e => setConsent(e.target.checked)} />I understand this ETH has no refund or recovery path.</label>
          <div className="button-row"><button className="button primary" disabled={!ready || !consent || active(fund) || active(poke)} onClick={() => void execute('fund')}>{active(fund) ? 'Transfer pending…' : `Send ${formatEther(review)} ETH`}</button><button className="button" disabled={active(fund)} onClick={() => setReview(undefined)}>Cancel</button></div>
        </div>}
        <TxStatus tx={fund} config={config} check={() => { if (fund.hash) void confirmation('fund', fund.hash); }} />
      </div>
    </section>
    <section className="poke-section numbered-section" aria-labelledby="poke-title"><div><h2 id="poke-title"><span>03</span> Write the observation.</h2><p>Ethereum does not schedule this call for you. The high-water mark is a record of observed balances, not a history of every block. The alarm only arms when <code>highWaterMark ≥ thresholdWei</code>. Anyone can call <code>poke()</code> to record the current balance or the first observed trip.</p><p className="fine">No bounty moves. No caller reward. You pay Ethereum network gas. Poke after the bounty reaches {snapshot ? formatEther(snapshot.thresholdWei) : 'the threshold in'} ETH, then check the high-water mark.</p></div><div className="poke-action">
      {!wallet.account ? <button className="button" onClick={wallet.connect} disabled={wallet.busy}>{wallet.busy ? 'Connecting wallet…' : 'Connect wallet to poke'}</button> : wallet.wrongChain ? <p className="warning-text">Switch to Ethereum with the wallet control above to poke.</p> : <button className="button" disabled={!ready || active(fund) || active(poke)} onClick={() => void execute('poke')}>{active(poke) ? 'Poke pending…' : 'Call poke()'} <span aria-hidden="true">↗</span></button>}
      <TxStatus tx={poke} config={config} check={() => { if (poke.hash) void confirmation('poke', poke.hash); }} />
    </div></section>
  </>;
}
