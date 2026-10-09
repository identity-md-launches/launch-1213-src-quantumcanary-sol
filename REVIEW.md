# Local security review

Scope: `src/QuantumCanary.sol`, its Foundry configuration, independent verifier and tests. This is the building agent's source review and local evidence, not an independent contributor audit.

| Area | Finding and evidence |
| --- | --- |
| Key generation | The seed is a single literal, not an argument. Each candidate hashes the 64-byte ABI input; `addmod`/`mulmod` avoid overflowing the field arithmetic. The precompile result is checked for call success, length and curve membership, then canonicalised to even y. The independent pure Solidity and Python implementations agree. |
| Permissions | There is no owner, role, initializer, proxy or configurable address. `poke()` is permissionless and only modifies observation fields. Fuzzed callers and unknown selectors cannot mutate immutables or move ETH. |
| Custody | All entry points, including construction, reject value. The runtime has no call, creation or destruction opcodes. Donations go directly to the canary. Forced credits to the observer remain stuck and do not alter its observed balance. |
| Observation semantics | The high-water mark never decreases. The view uses only live canary balance, immutable threshold and stored mark. The first trip is immutable even after refills or subsequent drops. A private recorded flag handles timestamp/block zero safely. |
| Boundaries | Zero thresholds revert. Fuzzed positive uint256 thresholds include extremes and compare exact-threshold versus one-wei-below behaviour. The constructor accounts for pre-funding. Unobserved funding, transient trips and refills are covered. |
| External dependency | Only construction calls the fixed modexp precompile by static call. It cannot re-enter mutable runtime state. Failure and malformed return length cause deployment to revert. The compiler's loop-call and loop-revert lints describe the required try-and-increment algorithm; the seed is fixed and its first candidate is valid. |
| Deployment | Local CREATE2 rehearsal succeeds with a 1 ETH threshold on chain ID 1. Runtime length is bounded below EIP-170 and scanned with PUSH payloads skipped, matching the supplied protected check's treatment of instruction data. No external libraries require linking. |

The main residual risks are inferential and observational, not administrative. A CRQC is one possible explanation of an authenticated spend, and the alarm cannot identify hardware. The inference depends on cryptographic assumptions and Ethereum consensus/account rules. No Solidity observer can reconstruct all unobserved balances, enforce a permanent live alarm after refill under the required predicate, or prevent forced ETH credits. These limits and operational responsibilities are documented in the README.

Validation uses offline Foundry unit/fuzz tests, opcode inspection, and an independent Python verifier. No wallet, mainnet transaction or RPC-backed fork was used. Slither, Mythril and an independent audit were not run. These results do not establish that a CRQC exists or that a private key is mathematically unknowable.
