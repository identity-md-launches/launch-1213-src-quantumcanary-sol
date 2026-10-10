import { describe, it, expect, vi } from 'vitest';
import { parseEther, toHex, encodeAbiParameters, keccak256 } from 'viem';
import { community, pricing, type Client, type Config } from '../src/config';
import { poolMidPrice, poolStateSlot, readEthUsd, readMarketSnapshot, usdValue } from '../src/market-chain';
import handoff from '../config/deployment.json';
import network from '../config/network.json';
const config = { manifest: { ...handoff, ...network }, contract: handoff.contracts[0] } as unknown as Config;
const q96 = 1n << 96n;
const timestamp = 1_700_000_000n;
function fixture() {
  return {
    getChainId: vi.fn(async () => 1),
    getBlock: vi.fn(async () => ({ number: 100n, timestamp, hash: '0xabc' })),
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => functionName === 'latestRoundData'
      ? [2n, 2000n * 10n ** 8n, timestamp - 10n, timestamp - 10n, 2n]
      : toHex((12_500n << 208n) | (q96 * 10_000n), { size: 32 })),
  };
}
describe('mainnet mid price and dollar context', () => {
  it('uses Uniswap v4 mapping slot 6 and the supplied pool ID', () => {
    expect(poolStateSlot).toBe(keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'uint256' }], [community.poolId, 6n])));
  });
  it('inverts token/ETH, masks tick/fees, and values the full fixed supply', () => {
    const value = poolMidPrice((12_500n << 208n) | (123n << 160n) | (q96 * 10_000n));
    expect(value.priceWei).toBe(10_000_000_000n);
    expect(value.fdvWei).toBe(parseEther('10'));
    expect(poolMidPrice(q96 / 2n).priceWei).toBe(parseEther('4'));
    expect(() => poolMidPrice(0n)).toThrow('initialized');
  });
  it('computes FDV before per-token rounding and formats small USD values honestly', () => {
    const value = poolMidPrice(q96 * 3n);
    expect(value.fdvWei).toBe(parseEther('1000000000') / 9n);
    expect(value.fdvWei).not.toBe(value.priceWei * 1_000_000_000n);
    expect(usdValue(parseEther('0.01'), 2000n * 10n ** 8n)).toBe('$20.00');
    expect(usdValue(10_000_000_000n, 2000n * 10n ** 8n, 8)).toBe('$0.00002');
    expect(usdValue(1n, 2000n * 10n ** 8n)).toBe('<$0.01');
    expect(usdValue(0n, 2000n * 10n ** 8n)).toBe('$0.00');
  });
  it('pins both independent reads to the same block and runtime PoolManager', async () => {
    const f = fixture();
    const value = await readMarketSnapshot(config, f as unknown as Client);
    expect(value.ethUsd).toBe(2000n * 10n ** 8n);
    expect(value.pool?.fdvWei).toBe(parseEther('10'));
    expect(f.readContract).toHaveBeenCalledWith(expect.objectContaining({ address: config.manifest.network.uniswapV4.poolManager, functionName: 'extsload', args: [poolStateSlot], blockNumber: 100n }));
    expect(f.readContract).toHaveBeenCalledWith(expect.objectContaining({ address: pricing.ethUsdFeed, functionName: 'latestRoundData', blockNumber: 100n }));
  });
  it.each([
    [0n, 1n, timestamp, timestamp, 1n],
    [2n, 0n, timestamp, timestamp, 2n],
    [2n, -1n, timestamp, timestamp, 2n],
    [2n, 1n, timestamp, 0n, 2n],
    [2n, 1n, timestamp, timestamp + 1n, 2n],
    [2n, 1n, timestamp, timestamp - pricing.feedMaxAgeSeconds - 1n, 2n],
    [2n, 1n, timestamp, timestamp, 1n],
  ])('rejects invalid/incomplete/stale oracle data (case %#)', async (...round) => {
    const f = fixture(); f.readContract.mockResolvedValue(round);
    await expect(readEthUsd(f as unknown as Client, 100n, timestamp)).rejects.toThrow('current');
  });
  it('lets an oracle outage hide only USD, and a pool outage hide only market values', async () => {
    const f = fixture(); f.readContract.mockRejectedValueOnce(Error('oracle offline'));
    const value = await readMarketSnapshot(config, f as unknown as Client);
    expect(value.ethUsd).toBeUndefined(); expect(value.pool?.priceWei).toBe(10_000_000_000n);
    f.readContract.mockResolvedValueOnce([2n, 2000n * 10n ** 8n, timestamp, timestamp, 2n]).mockRejectedValueOnce(Error('pool offline'));
    const next = await readMarketSnapshot(config, f as unknown as Client);
    expect(next.ethUsd).toBe(2000n * 10n ** 8n); expect(next.pool).toBeUndefined();
  });
  it('rejects wrong-chain observations and reorgs', async () => {
    const f = fixture(); f.getChainId.mockResolvedValueOnce(10);
    await expect(readMarketSnapshot(config, f as unknown as Client)).rejects.toThrow('another chain');
    f.getBlock.mockResolvedValueOnce({ number: 100n, timestamp, hash: '0xabc' }).mockResolvedValueOnce({ number: 100n, timestamp, hash: '0xdef' });
    await expect(readMarketSnapshot(config, f as unknown as Client)).rejects.toThrow('reorganized');
  });
});
