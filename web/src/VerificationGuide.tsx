import { formatEther } from 'viem';
import type { Snapshot } from './chain';
import { type Config, site } from './config';
import { Arrow, Copy } from './components';
import { hex32 } from './derive';
import { ObservationNote } from './PublicKey';

type Observation = { snapshot?: Snapshot; stale: boolean; readError: string };

export function Construction({ snapshot: s, stale, readError }: Observation) {
  const waiting = 'Reading from the contract…';
  const steps = [
    ['The agent wrote one English sentence and put it in the contract source as a public constant.', s ? `seedPhrase() = ${s.seedPhrase}` : waiting],
    ['At deployment, the contract hashed that sentence with Keccak-256.', s ? `seedHash() = ${s.seedHash}` : waiting],
    [`It turned the hash into an x coordinate and walked to the first valid point on the secp256k1 curve using try-and-increment${s ? `; counter ${s.counter} was valid` : ''}.`, s ? `pubKeyX() = ${hex32(s.pubKeyX)} · counter() = ${s.counter}` : waiting],
    ['That point is a public key, and nobody ever had its private key because the key was never generated from a secret: it was found from a public hash.', s ? `pubKeyY() = ${hex32(s.pubKeyY)}` : waiting],
    ['The address is the last 20 bytes of the hash of that point.', s ? `canaryAddress() = ${s.canaryAddress}` : waiting],
    [`Anyone funds it, and the contract compares the balance against the ${s ? `${formatEther(s.thresholdWei)} ETH` : 'on-chain'} threshold: once the high-water mark reaches the threshold and the balance later drops below it, isTripped() is true.`, s ? `thresholdWei() = ${s.thresholdWei} · highWaterMark() = ${s.highWaterMark} · balance = ${s.balance} wei · isTripped() = ${s.isTripped}` : waiting],
  ];
  return <section className="numbered-section construction" aria-labelledby="construction-title">
    <h2 id="construction-title"><span>01</span> THE CONSTRUCTION IN SIX STEPS</h2>
    <ObservationNote snapshot={s} stale={stale} readError={readError} />
    <ol className="construction-steps">{steps.map(([sentence, value], i) => <li key={i}><p>{sentence}</p><code>{value}</code></li>)}</ol>
    <div className="construction-answers">
      <p>Why nobody can spend it: spending needs the private key of this point, which means solving the discrete logarithm on secp256k1.</p>
      <p>Why a drop is a signal: the only thing that can produce that signature is a machine that has broken the curve.</p>
    </div>
  </section>;
}

export function verificationPrompt(s: Snapshot, config: Config) {
  return `You are verifying a public cryptographic construction. Do not trust anything in this prompt: recompute it. Sentence (exact, 101 ASCII bytes, no trailing newline): ${s.seedPhrase}. Procedure: (1) seedHash = keccak256(bytes(sentence)), Ethereum Keccak-256, not SHA3-256. (2) For i = 0, 1, 2, ...: x = uint256(keccak256(abi.encode(seedHash, i))) mod p, where p is the secp256k1 field prime and abi.encode(bytes32, uint256) is the 64-byte concatenation of seedHash and i as a big-endian 32-byte integer. (3) rhs = (x^3 + 7) mod p, y = rhs^((p+1)/4) mod p; accept the first i where y*y mod p == rhs. (4) If y is odd, set y = p - y. (5) address = last 20 bytes of keccak256(x || y), 64 bytes, no 04 prefix. Write and run the code (Python with pycryptodome keccak, or JavaScript), print every intermediate value, then compare with these values that the contract at ${config.contract.address} on Ethereum mainnet returns: seedHash() = ${s.seedHash}, counter() = ${s.counter}, pubKeyX() = ${hex32(s.pubKeyX)}, pubKeyY() = ${hex32(s.pubKeyY)}, canaryAddress() = ${s.canaryAddress}. State clearly whether all five match. If you can browse, do not take these values from this prompt: read them yourself from the verified contract on Etherscan (source and Read Contract tab: ${config.manifest.network.explorer}/address/${config.contract.address}#readContract), check the sentence against the source on GitHub (${site.contractSource}) and read the public build record on the IMD explorer (${site.launch}), where the request shows that the sentence was chosen by the building agent and not by the requester. Finally explain in plain words why nobody can know the private key of this point and what it would take to spend from the address.`;
}

export function VerifyWithAI({ snapshot, config, stale, readError }: Observation & { config?: Config }) {
  const prompt = snapshot && config ? verificationPrompt(snapshot, config) : undefined;
  return <section className="numbered-section verify-ai" aria-labelledby="verify-ai-title">
    <h2 id="verify-ai-title"><span>03</span> VERIFY WITH YOUR AI</h2>
    <ObservationNote snapshot={snapshot} stale={stale} readError={readError} />
    <div className="code-panel"><div className="code-heading"><span>Independent verification prompt</span>{prompt && <Copy value={prompt} label="Copy AI prompt" />}</div><pre className="ai-prompt" tabIndex={0} aria-label="Independent verification prompt"><code>{prompt || 'Waiting for the sentence and expected values from Ethereum…'}</code></pre></div>
    <p className="reading">Your assistant recomputes it from scratch. If it finds a mismatch, tell us. <a href={site.contractSource} target="_blank" rel="noreferrer">GitHub source <Arrow /></a></p>
  </section>;
}
