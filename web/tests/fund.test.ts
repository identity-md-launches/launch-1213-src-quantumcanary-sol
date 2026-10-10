import { describe, expect, it, vi } from 'vitest';
import { parseEther } from 'viem';
import { community, type Client, type Config } from '../src/config';
import { readFundSnapshot, sumBountyPaid } from '../src/fund-chain';
import { derivationTranscript } from '../src/Verify';
import { derive } from '../src/derive';
import type { Snapshot } from '../src/chain';
import handoff from '../config/deployment.json';
import network from '../config/network.json';
const config = { manifest: { ...handoff, ...network }, contract: handoff.contracts[0] } as unknown as Config;
function fixture() {
  const getters: Record<string, unknown> = { accruedFees: parseEther('0.25'), retired: false, canaryAddress: community.canary, quantumCanary: config.contract.address, poolManager: config.manifest.network.uniswapV4.poolManager };
  const client = {
    getCode: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => blockNumber === community.eventsFromBlock ? '0x' : '0x6000'),
    getChainId: vi.fn(async () => 1),
    getBlock: vi.fn(async () => ({ number: community.eventsFromBlock + 100n, hash: '0xabc', timestamp: BigInt(Math.floor(Date.now() / 1000)) })),
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => getters[functionName]),
    getContractEvents: vi.fn(async () => [{ removed: false, args: { destination: community.canary, ethAmount: parseEther('0.02') } }]),
  };
  return { client, getters, typed: client as unknown as Client };
}
describe('complete hook payment history', () => {
  it('sums complete, non-overlapping ranges with exact wei', async () => {
    const f = fixture();
    const total = await sumBountyPaid(f.typed, community.eventsFromBlock + 20_000n);
    expect(total).toBe(parseEther('0.06'));
    expect(f.client.getContractEvents.mock.calls.map(c => (c as unknown as [{ fromBlock: bigint; toBlock: bigint }])[0]).map(c => [c.fromBlock, c.toBlock])).toEqual([
      [community.eventsFromBlock, community.eventsFromBlock + 9_999n],
      [community.eventsFromBlock + 10_000n, community.eventsFromBlock + 19_999n],
      [community.eventsFromBlock + 20_000n, community.eventsFromBlock + 20_000n],
    ]);
  });
  it('does not publish a partial total after any missing page', async () => {
    const f = fixture(); f.client.getContractEvents.mockRejectedValueOnce(Error('history unavailable'));
    await expect(sumBountyPaid(f.typed, community.eventsFromBlock + 10_000n)).rejects.toThrow('history unavailable');
  });
  it('refuses a lifetime total if hook code already existed at its boundary', async () => {
    const f = fixture(); f.client.getCode.mockResolvedValue('0x6000');
    await expect(sumBountyPaid(f.typed, community.eventsFromBlock + 100n)).rejects.toThrow('complete total');
    expect(f.client.getContractEvents).not.toHaveBeenCalled();
  });
  it('refuses removed events or an unexpected recipient', async () => {
    const f = fixture(); f.client.getContractEvents.mockResolvedValue([{ removed: true, args: { destination: community.canary, ethAmount: 1n } }]);
    await expect(sumBountyPaid(f.typed, community.eventsFromBlock + 100n)).rejects.toThrow('Unexpected');
    f.client.getContractEvents.mockResolvedValue([{ removed: false, args: { destination: community.hook, ethAmount: 1n } }]);
    await expect(sumBountyPaid(f.typed, community.eventsFromBlock + 100n)).rejects.toThrow('Unexpected');
  });
  it('shows pending fees and retirement even when complete history is unavailable', async () => {
    const f = fixture(); f.client.getContractEvents.mockRejectedValue(Error('logs failed'));
    const value = await readFundSnapshot(config, f.typed);
    expect(value.accruedFees).toBe(parseEther('0.25')); expect(value.retired).toBe(false);
    expect(value.paid).toBeUndefined(); expect(value.paidError).toContain('No partial total');
  });
  it.each(['canaryAddress', 'quantumCanary', 'poolManager'])('rejects a mismatched %s', async field => {
    const f = fixture(); f.getters[field] = community.token;
    await expect(readFundSnapshot(config, f.typed)).rejects.toThrow('does not match');
  });
  it('rejects wrong chain, missing code and a reorg', async () => {
    const f = fixture(); f.client.getChainId.mockResolvedValueOnce(10);
    await expect(readFundSnapshot(config, f.typed)).rejects.toThrow('another chain');
    f.client.getCode.mockResolvedValueOnce('0x');
    await expect(readFundSnapshot(config, f.typed)).rejects.toThrow('No community hook code');
    f.client.getBlock.mockResolvedValueOnce({ number: community.eventsFromBlock + 100n, hash: '0xabc', timestamp: 1n }).mockResolvedValueOnce({ number: community.eventsFromBlock + 100n, hash: '0xdef', timestamp: 1n });
    await expect(readFundSnapshot(config, f.typed)).rejects.toThrow('reorganized');
  });
});
describe('terminal transcript', () => {
  it('prints actual rejected candidates, parity selection and a mismatched getter', () => {
    let phrase = ''; let result;
    for (let n = 0; n < 50; n++) { phrase = `Public verification fixture ${n}`; result = derive(phrase); if (result.attempts.length > 1) break; }
    const r = result!;
    const snapshot = { seedPhrase: phrase, seedHash: r.seedHash, counter: r.counter, pubKeyX: r.x + 1n, pubKeyY: r.y, canaryAddress: r.address, block: 1n } as Snapshot;
    const rows = derivationTranscript(snapshot, r);
    expect(rows.filter(x => x.compare)).toHaveLength(5);
    expect(rows.filter(x => x.compare && !x.match).map(x => x.text)).toEqual(['MISMATCH  pubKeyX()']);
    expect(rows.filter(x => x.text.startsWith('candidate x'))).toHaveLength(r.attempts.length);
    expect(rows.some(x => x.text.includes('REJECT / increment counter'))).toBe(true);
    expect(rows.some(x => x.text.startsWith('parity fix'))).toBe(true);
    expect(rows.some(x => x.text.includes(r.address))).toBe(true);
  });
});
