import { getAddress, type Address, type Hex } from 'viem';
import { derive } from './derive';
import { tokenAbi, type Client, type Config } from './config';

export type Snapshot = {
  block: bigint; blockTime: bigint; blockHash: Hex; fetchedAt: number;
  seedPhrase: string; seedHash: Hex; pubKeyX: bigint; pubKeyY: bigint; counter: bigint;
  canaryAddress: Address; balance: bigint; thresholdWei: bigint; highWaterMark: bigint;
  isTripped: boolean; trippedAt: bigint; trippedBlock: bigint;
  imdBalance?: bigint; imdError?: string; verified: boolean; verificationError?: string;
};
const fields = ['seedPhrase', 'seedHash', 'pubKeyX', 'pubKeyY', 'counter', 'canaryAddress', 'thresholdWei', 'highWaterMark', 'isTripped', 'trippedAt', 'trippedBlock'] as const;
export async function readSnapshot(config: Config, client: Client): Promise<Snapshot> {
  if (await client.getChainId() !== config.manifest.chainId) throw Error('RPC returned the wrong chain. Retry with a verified Ethereum connection.');
  const block = await client.getBlock({ blockTag: 'latest' });
  const values = await Promise.all(fields.map(functionName => client.readContract({ address: config.contract.address, abi: config.abi, functionName, args: [], blockNumber: block.number })));
  const read = Object.fromEntries(fields.map((f, i) => [f, values[i]])) as unknown as Pick<Snapshot, typeof fields[number]>;
  const address = getAddress(read.canaryAddress);
  const [balance, code, canaryCode, token] = await Promise.all([
    client.getBalance({ address, blockNumber: block.number }),
    client.getCode({ address: config.contract.address, blockNumber: block.number }),
    client.getCode({ address, blockNumber: block.number }),
    Promise.all([
      client.readContract({ address: config.manifest.network.pairToken.address, abi: tokenAbi, functionName: 'balanceOf', args: [address], blockNumber: block.number }),
      client.readContract({ address: config.manifest.network.pairToken.address, abi: tokenAbi, functionName: 'decimals', blockNumber: block.number }),
      client.readContract({ address: config.manifest.network.pairToken.address, abi: tokenAbi, functionName: 'symbol', blockNumber: block.number }),
    ]).then(v => ({ value: v, error: undefined })).catch(() => ({ value: undefined, error: 'IMD read unavailable. The ETH alarm is still shown. Retry reads.' })),
  ]);
  if (!code || code === '0x') throw Error('No observer code at the configured address. Transactions are disabled.');
  const derived = derive(read.seedPhrase);
  const matches = derived.seedHash === read.seedHash && derived.x === read.pubKeyX && derived.y === read.pubKeyY && derived.counter === read.counter && derived.address.toLowerCase() === address.toLowerCase();
  const validAlarm = read.thresholdWei > 0n && read.isTripped === (balance < read.thresholdWei && read.highWaterMark >= read.thresholdWei);
  // A reorg between numbered RPC reads must not be presented as one snapshot.
  const confirm = await client.getBlock({ blockNumber: block.number });
  if (confirm.hash !== block.hash) throw Error('The chain reorganized during this observation. Retry reads.');
  const ordinaryAccount = !canaryCode || canaryCode === '0x';
  const tokenValid = token.value && token.value[1] === config.manifest.network.pairToken.decimals && token.value[2] === config.manifest.network.pairToken.symbol;
  return {
    ...read, canaryAddress: address, balance, block: block.number, blockTime: block.timestamp, blockHash: block.hash,
    fetchedAt: Date.now(), imdBalance: tokenValid ? token.value![0] : undefined,
    imdError: token.error || (!tokenValid ? 'IMD metadata did not match the configured token. Token counter unavailable.' : undefined),
    verified: matches && validAlarm && ordinaryAccount,
    verificationError: !matches ? 'On-chain values do not match the locally derived key. Transactions are disabled.' : !validAlarm ? 'The alarm fields disagree. Transactions are disabled; retry reads.' : !ordinaryAccount ? 'The canary has account code or delegation. Investigate before funding; transactions are disabled.' : undefined,
  };
}
export function alarmState(s: Pick<Snapshot, 'isTripped' | 'highWaterMark' | 'thresholdWei' | 'balance'>) {
  if (s.isTripped) return 'TRIPPED';
  if (s.highWaterMark < s.thresholdWei) return s.balance >= s.thresholdWei ? 'AWAITING POKE' : 'NOT YET FUNDED';
  return 'ARMED';
}
export function errorMessage(error: unknown) {
  const e = error as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } };
  if (e?.code === 4001 || e?.cause?.code === 4001 || /rejected|denied/i.test(e?.message ?? '')) return 'Request declined in your wallet. Nothing new was submitted. You can try again.';
  if (/insufficient funds/i.test(e?.message ?? '')) return 'Insufficient ETH for the amount and network gas. Lower the amount or fund your wallet.';
  return (e?.shortMessage || e?.message || 'Request failed. Check your connection and retry.').split('\n')[0].slice(0, 260);
}
