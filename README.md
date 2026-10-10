# QuantumCanary

QuantumCanary is one immutable, ownerless Solidity observer for a public ETH bounty at a deterministically derived secp256k1 address. The constructor derives the public key entirely on chain. Nobody generates or retains a private key. Donations go **directly to `canaryAddress()`**, never to the observer contract.

The Ethereum mainnet launch uses `thresholdWei = 1000000000000000000` (1 ETH). Once a balance at least that large has been recorded, a live balance below it triggers `isTripped()`. Anyone can call `poke()` to record funding or the first observed trip. There are no fees, rewards for poking, owners, administrators, upgrades, withdrawal methods, payable entry points, or external runtime calls.

## Public website

The live-deployment frontend is in [`web/`](web/README.md), with the ready-to-host static export in [`dist/`](dist/index.html). It provides Status, in-browser key verification and integration documentation for Ethereum mainnet launch 1213. Build/configuration instructions are in [web/README.md](web/README.md), worker-side checks in [web/VALIDATION.md](web/VALIDATION.md), and the implemented visual system in [DESIGN.md](DESIGN.md). The contract implementation and its build configuration are unchanged by the frontend task.

## Seed and derivation

The following sentence was written by the building agent, not the requester. It is exactly 101 plain-ASCII bytes, including the final period; the code block's terminating newline is **not** part of the phrase. The contract contains it once as the public string constant `SEED_PHRASE`; both `SEED_PHRASE()` and `seedPhrase()` return it.

```text
IMD Quantum Canary #1 warns that if this balance ever drops, a quantum computer has broken secp256k1.
```

The constructor accepts only `uint256 thresholdWei_`. It rejects zero with `InvalidThreshold()` because a zero threshold can never trip. Every positive uint256 is supported, although only 1 ETH is intended for this launch. The threshold, caller, deployment address, chain ID and block data do not influence the derived key.

The algorithm is:

1. Use the secp256k1 field prime `p = 2^256 - 2^32 - 977`, or `0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f`. The curve is `y^2 = x^3 + 7 (mod p)`; its cofactor is 1. These are the parameters in [Standards for Efficient Cryptography 2 (SEC 2), section 2.4.1](https://www.secg.org/sec2-v2.pdf).
2. Compute `seedHash = keccak256(bytes(SEED_PHRASE))`. This is Ethereum Keccak-256, **not** NIST SHA3-256.
3. Start with counter `i = 0`. Encode `seedHash` and `i` with `abi.encode(bytes32, uint256)`: exactly 64 bytes, the 32 hash bytes followed by a 32-byte big-endian counter.
4. Compute `x = uint256(keccak256(abi.encode(seedHash, i))) % p`. Incrementing refers to the counter in the hash input, not adding one to the preceding x-coordinate.
5. Compute `rhs = addmod(mulmod(mulmod(x, x, p), x, p), 7, p)`. These modular operations avoid intermediate uint256 overflow.
6. Since `p % 4 == 3`, obtain the candidate square root `y = rhs^((p + 1) / 4) mod p`. The constructor uses `STATICCALL` to Ethereum's modexp precompile at `0x05`, supplying six 32-byte words: `32, 32, 32, rhs, (p + 1) / 4, p`. Failure or an output length other than 32 bytes reverts with `ModExpFailed()`. The format is specified by [EIP-198](https://eips.ethereum.org/EIPS/eip-198).
7. If `mulmod(y, y, p) != rhs`, increment `i` and repeat from step 3. Accept the **first** valid point. If `y` is odd, replace it with `p - y`, selecting the even root.
8. Concatenate x and y as two 32-byte big-endian words with `abi.encodePacked(x, y)`. Do **not** prepend the uncompressed-key marker `0x04`. The canary is the low 20 bytes of `keccak256` of those 64 bytes: `address(uint160(uint256(keccak256(abi.encodePacked(x, y)))))`.
9. Store `seedHash`, `pubKeyX`, `pubKeyY`, `counter`, `canaryAddress` and `thresholdWei` as immutables. Emit `CanaryDerived(bytes32 indexed seedHash, address indexed canaryAddress, uint256 pubKeyX, uint256 pubKeyY, uint256 counter, uint256 thresholdWei)`. Initialise `highWaterMark` to the canary's current balance, allowing funding before deployment.

For the exact phrase above, independently reproduced values are:

| Field | Value |
| --- | --- |
| `seedHash` | `0x24049af853e3f3a0d855c4dcaaed3fc054dcaae445f08ff572999789ab606655` |
| `counter` | `0` |
| `pubKeyX` | `0xae07cae0c4e680f898fc1655da5e33c66be3bd8ddc07934fcbdadc7d3e674625` |
| `pubKeyY` | `0x6b5e6d8b021bca37ceaa23d85cefadca41979671e49af160f49b7d27e4b9affa` |
| `canaryAddress` | `0x379c0a5704c211f26eadd26e670246e242af9e7e` |

This is the derived **bounty address**, not an observer deployment address or a claim that anything has been deployed. The constructor computes these values; it does not trust this table or a script.

## Why the private key is unknown

A private scalar `d` exists such that the derived point equals `d * G`, because secp256k1 has prime order and cofactor 1. This construction selects coordinates directly by hashing, then solving the curve equation. It never computes `d`. In particular, **the seed hash is not the private key**, and the algorithm does not multiply a known seed scalar by the generator.

Under the standard hardness assumptions for secp256k1 discrete logarithms and Keccak preimages, the choice of phrase cannot weaken the key: the private key remains unknown for any phrase processed this way. Knowing or choosing the phrase gives no shortcut to its discrete logarithm. Finding a phrase whose output matches a known private key would itself require defeating those assumptions. This is a computational security claim, not a mathematical proof that no conceivable person could know the key.

**Warning: forcing the funded canary balance below the threshold is computationally infeasible without a CRQC under those assumptions.** There is no mainnet test switch, recovery key, withdrawal administrator or refund path. A party able to derive the private key can sign an ordinary transaction and collect the ETH; gas expenditure also decreases the balance. Donations may remain locked forever.

The intended interpretation is a CRQC alarm. A balance change alone cannot prove which hardware or algorithm caused it. A classical cryptographic breakthrough, a targeted 160-bit address preimage, or an Ethereum consensus/client failure or rule change could undermine the inference. The claim also assumes the canary was an ordinary account without pre-existing code or delegation. Ethereum's [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) requires a secp256k1 authorization to install a delegation, so it does not provide an ordinary bypass before a signature break. These are assumptions about the signal, not extra trust in the deployer.

## Observations and integration

The live view is exactly:

```solidity
canaryAddress.balance < thresholdWei && highWaterMark >= thresholdWei
```

It does not depend on `trippedAt`, `trippedBlock`, the caller, or the clock. `highWaterMark` is the maximum balance **observed** by the constructor or a `poke()`, not the historical maximum across every block. Equality with the threshold arms the canary but does not trip it.

When `poke()` observes a larger balance, it raises the mark and emits `HighWaterMarkUpdated(previousMark, newMark)`. When it first observes the live trip condition, it permanently records `trippedAt = block.timestamp` and `trippedBlock = block.number`, then emits `CanaryTripped(balance, highWaterMark, trippedAt, trippedBlock)`. Repeated calls cannot change that first record or emit another trip. A separate private flag prevents timestamp/block zero from becoming a reset mechanism on a local chain. Mainnet's nonzero timestamps and blocks make either recorded field a usable historical-trip indicator.

All required reads are exposed: `seedPhrase()`, `seedHash()`, `canaryAddress()`, `pubKeyX()`, `pubKeyY()`, `counter()`, `thresholdWei()`, `highWaterMark()`, `trippedAt()`, `trippedBlock()` and `isTripped()`.

Operational responsibilities:

- Fund the derived canary address directly, then have any participant call `poke()` once its balance is at least 1 ETH. Verify `highWaterMark() >= thresholdWei()`. An unobserved deposit followed by a withdrawal cannot arm the observer retrospectively.
- Anyone may pay gas to call `poke()` periodically or after a suspected drop. Once armed, a view detects the live drop even before that poke; recording its timestamp and event still requires a transaction.
- A refill to at least the threshold clears **the live view**, even after a recorded trip. The stored first-trip fields remain. Integrations that require a permanent alarm should also inspect `trippedBlock()` or retain the event after suitable finality.
- A drain and refill between observations can be missed. A decrease that stays at or above 1 ETH does not satisfy this threshold alarm. The recorded timestamp is the time of observation, not necessarily the time of the spending transaction.
- Watch the canonical Ethereum chain, account nonce/code and transaction history as well as the view. Account for reorganisations and finality. The same phrase produces the same bounty address on every chain and for every observer instance, but balances and observation histories are separate.

The observer rejects ordinary ETH transfers, value-bearing calls and value at construction. Nevertheless, no Ethereum recipient can prevent all unsolicited protocol-level credits: for example, [EIP-6780](https://eips.ethereum.org/EIPS/eip-6780) retains transfers to a `SELFDESTRUCT` beneficiary. Such forced ETH in the observer would be stuck, cannot affect this alarm, and cannot be swept. Thus “never holds ETH” describes the supported funding flow; an absolute zero-balance guarantee is impossible on Ethereum. Always donate to the canary.

## Independent verification and local checks

Requirements are Foundry, the pinned Solidity 0.8.26 compiler and, for the optional command-line verifier, Python 3.9 or later. `forge-std` v1.9.7 is vendored as ordinary source files with its licenses and archive checksum in `lib/forge-std/`. Builds and tests need no dependency downloads, RPC, environment configuration, FFI or filesystem cheatcode permissions. No external library linking is required.

```sh
forge build
forge test
forge fmt --check
python3 scripts/verify_canary.py
```

The Python verifier reads only the phrase from the source, implements the arithmetic independently with Python integers and `pow`, and uses `cast keccak` for hashing. It prints the table above without a network connection. To verify a phrase retrieved independently, pass its exact text as `--phrase '...'` without a newline. Do not substitute Python's `hashlib.sha3_256` for Keccak.

For an independent **pure Solidity** re-derivation, run:

```sh
forge test --match-test test_IndependentRederivation -vv
```

`test/helpers/IndependentDerivation.sol` builds the big-endian inputs byte by byte and uses square-and-multiply arithmetic instead of the modexp precompile. Starting from `seedPhrase()`, it searches from counter zero and compares the seed hash, first valid counter, x, even y and address against the contract. It does not use FFI or production derivation helpers.

Other tests cover curve membership, threshold fuzzing across uint256, pre-funding, unarmed and transient drops, direct donations, trip/refill sequences, events, precompile failure and malformed output, permissionless callers, immutable values, all nonpayable entry points, unknown selectors and a factory-style CREATE2 deployment. Runtime opcode inspection checks the absence of calls, contract creation, delegation and destruction. `vm.deal(canaryAddress, amount)` simulates a broken key **only in tests**; it is not a mainnet capability.

## Mainnet deployment handoff

Deploy only `src/QuantumCanary.sol:QuantumCanary` on Ethereum, chain ID **1**, with one constructor argument **`1000000000000000000`**, and transaction value **0**. There is no owner or recipient parameter, token, pool, proxy, supporting application contract, initialisation transaction or post-launch administrative configuration. Solidity names under `test/` are test scaffolding only.

`foundry.toml` pins Solidity 0.8.26, the Cancun EVM target, optimisation with 200 runs and `bytecode_hash = "none"`. The only constructor call is to the built-in modexp precompile, which is available on Ethereum and in the empty local EVM deployment rehearsal. The fixed phrase accepts counter zero, so no caller can enlarge the search by supplying a seed. Constructor arguments can be reproduced with:

```sh
cast abi-encode 'constructor(uint256)' 1000000000000000000
```

The deployment service supplies the factory transaction and confirmed observer address through the launch handoff; this repository does not fabricate an address or write `launch.json`. No mainnet transaction has been broadcast by this implementation task. Before funding, the launch operator should verify the source and deployment event, compare all derived fields and the 1 ETH threshold, and check that the canary has no existing code/delegation or unexpected spending history. After funding, record the armed balance with `poke()` and arrange public monitoring. There is no privileged operator required to continue monitoring.

The local review and tests are described in [REVIEW.md](REVIEW.md). They are not an independent security audit; independent review and deployment verification remain launch responsibilities.
