import { encodeAbiParameters, keccak256 } from 'viem';
import { community, pricing, priceFeedAbi, poolManagerReadAbi, type Client, type Config } from './config';

export type PoolMidPrice = { sqrtPriceX96: bigint; priceWei: bigint; fdvWei: bigint };
export type MarketSnapshot = { ethUsd?: bigint; pool?: PoolMidPrice; block: bigint; blockTime: bigint; fetchedAt: number };

// Uniswap v4 StateLibrary: pools is mapping slot 6; sqrtPriceX96 is the
// low 160 bits of slot0. See web/docs/market-reads.md for the source binding.
export const poolStateSlot = keccak256(encodeAbiParameters(
  [{ type: 'bytes32' }, { type: 'uint256' }], [community.poolId, pricing.poolsSlot],
));

export function poolMidPrice(slot0: bigint): PoolMidPrice {
  const sqrtPriceX96 = slot0 & ((1n << 160n) - 1n);
  if (sqrtPriceX96 === 0n) throw Error('Pool has no initialized price.');
  // This pool is native ETH (currency0) / 18-decimal CANARY (currency1).
  // sqrt² / 2^192 is CANARY per ETH, so invert it for ETH per CANARY.
  // Calculate FDV from the original ratio, before per-token rounding.
  const square = sqrtPriceX96 * sqrtPriceX96;
  return { sqrtPriceX96, priceWei: (1n << 192n) * 10n ** 18n / square, fdvWei: (1n << 192n) * community.supply / square };
}

export async function readEthUsd(client: Client, blockNumber: bigint, blockTime: bigint) {
  const [roundId, answer, , updatedAt, answeredInRound] = await client.readContract({
    address: pricing.ethUsdFeed, abi: priceFeedAbi, functionName: 'latestRoundData', blockNumber,
  });
  if (roundId === 0n || answer <= 0n || updatedAt === 0n || updatedAt > blockTime ||
      blockTime - updatedAt > pricing.feedMaxAgeSeconds || answeredInRound < roundId) throw Error('No current ETH/USD round.');
  return answer;
}

export async function readMarketSnapshot(config: Config, client: Client): Promise<MarketSnapshot> {
  if (await client.getChainId() !== config.manifest.chainId) throw Error('Market RPC returned another chain.');
  const block = await client.getBlock({ blockTag: 'latest' });
  const [usd, pool] = await Promise.allSettled([
    readEthUsd(client, block.number, block.timestamp),
    client.readContract({ address: config.manifest.network.uniswapV4.poolManager, abi: poolManagerReadAbi,
      functionName: 'extsload', args: [poolStateSlot], blockNumber: block.number }).then(value => poolMidPrice(BigInt(value))),
  ]);
  if ((await client.getBlock({ blockNumber: block.number })).hash !== block.hash) throw Error('Market observation reorganized.');
  return { ethUsd: usd.status === 'fulfilled' ? usd.value : undefined, pool: pool.status === 'fulfilled' ? pool.value : undefined,
    block: block.number, blockTime: block.timestamp, fetchedAt: Date.now() };
}

export function usdValue(wei: bigint, ethUsd: bigint, digits = 2) {
  const scale = 10n ** BigInt(digits);
  const denominator = 10n ** BigInt(18 + pricing.feedDecimals);
  const raw = wei * ethUsd;
  if (raw > 0n && raw * scale < denominator) return `<$0.${'0'.repeat(digits - 1)}1`;
  const units = (raw * scale + denominator / 2n) / denominator;
  const whole = (units / scale).toLocaleString('en-US');
  const fraction = (units % scale).toString().padStart(digits, '0');
  return `$${whole}.${digits === 2 ? fraction : fraction.replace(/0+$/, '') || '00'}`;
}
