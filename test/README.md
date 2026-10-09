# QuantumCanary test coverage

Run `forge build` and `forge test` with the project's pinned Solidity 0.8.26.
All tests run locally without RPC, FFI, environment variables, or additional
dependencies. The existing implementation and configuration are unchanged.

`QuantumCanary.t.sol` supplies the original unit and fuzz coverage.
`QuantumCanaryAdversarial.t.sol` adds:

- Independent derivation from `seedPhrase()` under fuzzed thresholds, deployers,
  chain IDs, timestamps, block numbers, and pre-funding. The existing reviewed
  `IndependentDerivation` helper encodes the hash inputs byte by byte and computes
  modular exponentiation with pure Solidity square-and-multiply. It does not call
  the production derivation or modexp precompile. The test compares the seed hash,
  first accepted counter, both coordinates, and address, and checks curve membership.
- Exact modexp input/call-count expectations for each candidate up to acceptance.
- Pre-funded threshold transitions across positive uint256 inputs, including
  explicit 1 wei and maximum-uint256 cases, delayed trip recording, refills,
  repeated thefts, and persistent first-trip records.
- Separate observation histories for two thresholds watching the same bounty.
- Deployment failure on malformed precompile output; continued runtime operation
  after the constructor's precompile dependency becomes unavailable in the test.
- Read-only getters and rejection of every value-bearing entry point while a trip
  is pending, with no event, record, immutable, or balance changes.

Each added property fuzz test carries an inline 1,000-run setting.

`QuantumCanaryInvariant.t.sol` targets only a bounded handler, for 256 sequences
of 96 calls. Unexpected handler reverts fail the run. Its actions interleave real
donations, simulated balance changes, permissionless pokes, getters, rejected
value and short-calldata calls, forced observer credits, and clock advances.

The three invariants verify:

1. The maximum observed balance, live alarm, first-trip timestamp/block, and event
   counts agree with a separately recorded input history. Unobserved funding or
   theft never silently becomes an observation.
2. The bounty equals total funding minus explicitly simulated theft. The observer
   retains exactly its forced credits. Contract calls cannot spend either balance.
3. Every immutable/constant getter and the deployed runtime remain unchanged.

A deterministic handler test also exercises a first trip at timestamp/block zero,
then a refill and later theft. This verifies that the invariant model distinguishes
an actual trip at zero from no recorded trip, using the event count as well as the
public timestamp and block fields.

`vm.deal` is used only to model test funding, forced credits, and hypothetical
quantum theft; it supplies no production withdrawal capability. These tests check
the derivation and observer behavior, not the impossibility of discovering a
private key or the existence of quantum hardware. The live alarm intentionally
clears on refill, while its first recorded trip remains permanent, as specified.
