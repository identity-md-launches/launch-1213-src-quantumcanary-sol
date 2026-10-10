import { community, hookAbi, type Client, type Config } from './config';

export type FundSnapshot = {
  accruedFees: bigint; retired: boolean; paid?: bigint; paidError?: string;
  block: bigint; blockTime: bigint; fetchedAt: number;
};
export async function sumBountyPaid(client: Client, toBlock: bigint): Promise<bigint> {
  const priorCode = await client.getCode({ address: community.hook, blockNumber: community.eventsFromBlock });
  if (priorCode && priorCode !== '0x') throw Error('The history boundary predates neither the hook nor its events. A complete total cannot be established.');
  if (toBlock < community.eventsFromBlock) throw Error('RPC block is earlier than the deployment history.');
  let total = 0n;
  // Bound each request for public RPC limits. If any page fails, no partial
  // total is returned or presented as a lifetime total.
  for (let fromBlock = community.eventsFromBlock; fromBlock <= toBlock; fromBlock += 10_000n) {
    const end = fromBlock + 9_999n < toBlock ? fromBlock + 9_999n : toBlock;
    const logs = await client.getContractEvents({ address: community.hook, abi: hookAbi, eventName: 'BountyPaid', fromBlock, toBlock: end, strict: true });
    for (const log of logs) {
      if (log.removed || log.args.destination.toLowerCase() !== community.canary.toLowerCase()) throw Error('Unexpected bounty event. A verified lifetime total is unavailable.');
      total += log.args.ethAmount;
    }
  }
  return total;
}
export async function readFundSnapshot(config: Config, client: Client): Promise<FundSnapshot> {
  if (await client.getChainId() !== config.manifest.chainId) throw Error('Fund RPC returned another chain. Payout disabled.');
  const block = await client.getBlock({ blockTag: 'latest' });
  const read = <T extends 'accruedFees' | 'retired' | 'canaryAddress' | 'quantumCanary' | 'poolManager'>(functionName: T) => client.readContract({ address: community.hook, abi: hookAbi, functionName, blockNumber: block.number });
  const [code, pending, retired, canary, observer, manager] = await Promise.all([
    client.getCode({ address: community.hook, blockNumber: block.number }),
    read('accruedFees'), read('retired'), read('canaryAddress'), read('quantumCanary'), read('poolManager'),
  ]);
  if (!code || code === '0x') throw Error('No community hook code at the configured address. Payout disabled.');
  if (canary.toLowerCase() !== community.canary.toLowerCase() || observer.toLowerCase() !== config.contract.address.toLowerCase() || manager.toLowerCase() !== config.manifest.network.uniswapV4.poolManager.toLowerCase()) throw Error('Hook destination, observer or PoolManager does not match the configured contracts. Payout disabled.');
  let paid: bigint | undefined;
  let paidError: string | undefined;
  try { paid = await sumBountyPaid(client, block.number); }
  catch { paidError = 'Complete BountyPaid history unavailable from the RPC. No partial total is shown. Retry fund reads.'; }
  const confirm = await client.getBlock({ blockNumber: block.number });
  if (confirm.hash !== block.hash) throw Error('The chain reorganized during fund reads. Retry fund reads.');
  return { accruedFees: pending, retired, paid, paidError, block: block.number, blockTime: block.timestamp, fetchedAt: Date.now() };
}
