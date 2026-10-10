# Community fund: provenance and source discrepancies

The supplied observer handoff attests **only QuantumCanary, launch 1213**. The redesign assignment explicitly supplies the token, hook and pool identifiers for launch 1235. They are kept together in `src/config.ts` as `community`; the original handoff, its contract set and its attestation are not expanded or misrepresented.

The minimal hook interface (including `BountyPaid(address indexed destination, uint256 ethAmount)` and the `uint256` result of `payout()`) was checked against the public [QuantumCanaryHook source at e69c854c9ea623bc155f74a8edd8c85e857cf2ac](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol). The accompanying [README at that commit](https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/README.md) explicitly describes payment of old claims after retirement. These are read-only source references, not instructions to change this task.

## Retirement is not a payout prohibition

The brief says the hook can never feed a compromised address. The published implementation does not establish that guarantee: `_observeTrip()` permanently sets `retired`, new fee collection checks that flag, but `_redeem()` observes the trip and then continues redeeming previously accrued claims to the fixed canary address. The published README confirms this distinction.

The website describes the difference in the main money-flow prose and footnote 2, links the exact source revision, and disables its own payout control when either the live observer is tripped or the hook is retired. This is a frontend guard, not a change to an immutable contract and not protection against callers using other interfaces. No contract was modified or redeployed.

The hook is absent from the provided attestation. Its on-chain code was nonempty and its destination, observer, PoolManager, pending claims and retired getters were read successfully. Those checks **do not independently prove a byte-for-byte binding between the public source revision and deployed hook**. Etherscan source retrieval returned HTTP 403 and Sourcify full/partial metadata returned 404 during this run. The interface must not promise a stronger retirement guarantee on this evidence.

## Buy example: headline rates and actual pool input

The requested example applies both headline rates to 1 ETH: 0.01 ETH to the canary, 0.0125 ETH to LP fees (0.01/0.0025 split), leaving 0.9775 ETH. It is retained as an explicitly labelled **headline-rate illustration**.

The public hook source reserves 1% before sending exact-input ETH into the pool. For a fully filled 1 ETH exact-input buy, the pool receives 0.99 ETH and takes 1.25% of that: 0.012375 ETH. The platform's stated 80/20 split is then 0.0099/0.002475 ETH, with 0.977625 ETH available for swap execution before price impact. The website puts these exact numbers immediately under the requested illustration. Neither example is a quote or an execution guarantee.

The sell example keeps currencies separate: the hook receives 1% of gross ETH output; LP fees are 1.25% of CANARY input. The platform's allocation, fee split, factory ownership and locked-liquidity policy come from the assignment. No factory address or recipient wallet was guessed. The interface offers no factory claim, trade, quote, approval or liquidity transaction.

## Payment totals

`fund-chain.ts` checks absence of hook code at observer deployment block 26,158,146 before using that block as the history lower bound. It sums complete, consecutive log ranges through the observed head. It checks recipient addresses and rejects removed events; any missing range gives an unavailable total, not a partial total or the canary's current balance. The block hash is checked again after reads to detect a reorganization during the observation.

This requires a public RPC with historical code and log access. Large histories can take longer to scan; failures leave pending claims and retirement readable and explicitly mark the total unavailable. No backend indexer or fabricated cached total is used.
