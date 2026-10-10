# Read-only market data

All addresses and interfaces live in `src/config.ts`. Application/observer configuration still loads from `dist/imd-deployment.json`; its supplied network block is unchanged. The task explicitly names the Chainlink ETH/USD proxy and CANARY pool ID. PoolManager comes from `manifest.network.uniswapV4.poolManager`. No quote, approval, swap, new backend, API key or other transaction was introduced.

## ETH/USD

`market-chain.ts` calls `latestRoundData()` on `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`, using the specified 8 decimals. The [Chainlink interface](https://docs.chain.link/data-feeds/api-reference#latestrounddata) supplies round ID, signed answer and update time. Missing/nonpositive answers, incomplete rounds, zero/future timestamps and rounds older than two hours are omitted. Oracle errors never become a banner or block native-ETH reads/actions.

`useMarket.ts` reads every 30 seconds while the document is visible and when it becomes visible. It shares the configured public RPC fallback and can fall back to a connected mainnet wallet's read provider. Optional market data is separate from the observer and fund snapshots. Each update is bound to a numbered block and its hash is checked again after reads. Values expire after 60 seconds without a fresh read or a chain head more than 180 seconds old. USD figures disappear on read failure and return after recovery. Amounts use integer arithmetic; sub-cent values are labelled `<$0.01`, not rounded to an apparent zero. Per-token USD uses up to 8 fractional digits.

## CANARY / ETH pool mid price

The [Uniswap v4 StateLibrary](https://github.com/Uniswap/v4-core/blob/main/src/libraries/StateLibrary.sol) was read during implementation. Its `POOLS_SLOT` is 6. The pool state slot is `keccak256(abi.encode(bytes32(poolId), uint256(6)))`; the two fixed-width fields are equivalent to the library's packed encoding. `PoolManager.extsload(bytes32)` returns slot0; its low 160 bits hold `sqrtPriceX96`. Tick and fee bits are masked away. Zero means an uninitialized price and is not displayed.

The supplied pool pairs native ETH as currency0 with 18-decimal CANARY as currency1. Thus `sqrtPriceX96² / 2^192` is CANARY per ETH. For the displayed inverse:

- one CANARY in wei = `floor(2^192 × 10^18 / sqrtPriceX96²)`;
- fully diluted value in wei = `floor(2^192 × fixedSupplyInBaseUnits / sqrtPriceX96²)`;
- fixed supply = 1,000,000,000 CANARY.

FDV is calculated from the original ratio, not a rounded displayed unit price. Dollar estimates multiply these wei values by the same Chainlink observation. The visible label is **Pool mid price**, with an explicit **Not a quote** caveat: no fees, gas, liquidity guarantee or price-impact estimate. Failure of this read hides only pool values; a valid ETH/USD observation remains useful for the bounty.

The worker's live browser read returned 0.00000001 ETH/CANARY and 10 ETH FDV at block 26,162,798, with a live Chainlink conversion. Those are observations in the validation report, never baked into the UI. Unit and browser fixtures independently test inverse orientation, packed-bit masking, arbitrary-precision FDV, small-dollar formatting, failure independence, stale/incomplete rounds and reorgs.

## Payout history

The existing complete event scan now also retains the latest 20 `BountyPaid` events in descending block/log order. Rows include exact ETH amounts, block numbers and transaction links. Each page is bounded to 10,000 blocks; invalid destinations, removed/duplicate/out-of-range events or missing metadata fail the history. A failed page gives neither a partial lifetime sum nor an apparently complete latest-20 list. No events is an explicit empty state.

**Hook payouts** is one list: it is also the incoming ETH history that this site can identify without an indexer. It does not claim to enumerate ordinary transfers, internal donations or all balance changes. Direct donations remain included in `eth_getBalance` and are explicitly excluded from this event list. The live hook had no payouts at the observed head; populated rows and the 20-event limit were validated with mocked RPC logs, without sending funds.
