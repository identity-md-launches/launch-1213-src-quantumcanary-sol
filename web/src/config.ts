import { createPublicClient, defineChain, fallback, http, custom, keccak256, toBytes, isAddress, parseAbi, type Abi, type Address, type EIP1193Provider } from 'viem';

export type Injected = EIP1193Provider & { on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: Injected } }
export type Manifest = {
  version: number; launchId: string; chainId: number; sourceCommit: string; attestationHash: string;
  contracts: { name: string; address: Address; abiHash: string; abiPath: string }[];
  assets: { path: string; sha256: string }[];
  network: { chainId: number; name: string; testnet: boolean; rpcUrls: string[]; explorer: string; nativeCurrency: { name: string; symbol: string; decimals: number }; pairToken: { address: Address; symbol: string; decimals: number }; uniswapV4: { poolManager: Address; universalRouter: Address; quoter: Address; stateView: Address; positionManager: Address; permit2: Address } };
  walletAddChain: { chainId: `0x${string}`; chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number }; blockExplorerUrls: string[] };
};
export const site = {
  source: 'https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol',
  contractSource: 'https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol/blob/main/src/QuantumCanary.sol',
  social: 'https://x.com/Quantum_Canary',
  launch: 'https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35',
  build: 'https://explorer.imd.fun/jobs/b68f0623-1b19-4525-9e78-0107eb8cc556',
  seedPhrase: 'IMD Quantum Canary #1 warns that if this balance ever drops, a quantum computer has broken secp256k1.',
  seedAuthor: 'The building agent of the imd.fun swarm',
  pollMs: 12_000,
  staleMs: 60_000,
};
// Optional community fund: addresses supplied by the redesign assignment.
// These are separate from the launch-1213 attestation in imd-deployment.json.
// No trading, quoting, approvals, router or factory transactions are offered.
export const community = {
  launch: 'https://explorer.imd.fun/token/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56',
  build: 'https://explorer.imd.fun/jobs/69561148-b678-420c-bf0b-3b6fb49af48f',
  repository: 'https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol',
  uniswap: 'https://app.uniswap.org/explore/tokens/ethereum/0x709927ed370da2b7ac5bd0b2df1fb172892b3b56',
  dexscreener: 'https://dexscreener.com/ethereum/0x34eac7f9a4c9b76df13ac4d0fbdc58055578ea9d3c1ea64d166c405476d49cd5',
  source: 'https://github.com/identity-md-launches/launch-1235-src-quantumcanaryhook-sol/blob/e69c854c9ea623bc155f74a8edd8c85e857cf2ac/src/QuantumCanaryHook.sol',
  token: '0x709927ed370da2b7ac5bd0b2df1fb172892b3b56' as Address,
  hook: '0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc' as Address,
  canary: '0x379C0A5704C211f26eadd26e670246E242Af9e7E' as Address,
  poolId: '0x34eac7f9a4c9b76df13ac4d0fbdc58055578ea9d3c1ea64d166c405476d49cd5' as const,
  lpFee: 12_500,
  tickSpacing: 60,
  supply: 1_000_000_000n * 10n ** 18n,
  // Earlier observer deployment is a conservative lower bound. Before summing
  // events we verify that the hook did not yet exist at this block.
  eventsFromBlock: 26_158_146n,
};
// Read-only sources explicitly supplied by the completion brief. The pool
// manager comes exclusively from the runtime deployment's network block.
export const pricing = {
  ethUsdFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' as Address,
  feedDecimals: 8,
  feedMaxAgeSeconds: 7_200n,
  poolsSlot: 6n,
  pollMs: 30_000,
};
export const priceFeedAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);
export const poolManagerReadAbi = parseAbi(['function extsload(bytes32 slot) view returns (bytes32)']);
export const hookAbi = parseAbi([
  'function accruedFees() view returns (uint256)',
  'function retired() view returns (bool)',
  'function canaryAddress() view returns (address)',
  'function quantumCanary() view returns (address)',
  'function poolManager() view returns (address)',
  'function payout() returns (uint256 paid)',
  'event BountyPaid(address indexed destination, uint256 ethAmount)',
  'error PayoutInProgress()',
  'error OnlyPoolManager()',
  'error UnexpectedUnlock()',
]);
export const tokenAbi = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value);
}
export async function loadConfig() {
  const response = await fetch('./imd-deployment.json', { cache: 'no-cache' });
  if (!response.ok) throw Error('Deployment configuration could not load. Reload this page.');
  const manifest = await response.json() as Manifest;
  const contract = manifest.contracts.find(c => c.name === 'QuantumCanary');
  if (!contract || !isAddress(contract.address) || manifest.version !== 1 || manifest.chainId !== manifest.network.chainId || !manifest.network.rpcUrls.length) throw Error('Deployment configuration is invalid. Transactions are disabled.');
  if (!/^abi\/[A-Za-z0-9_-]+\.json$/.test(contract.abiPath)) throw Error('Invalid ABI path.');
  const abiResponse = await fetch(`./${contract.abiPath}`);
  if (!abiResponse.ok) throw Error('Contract ABI could not load. Reload this page.');
  const abi = await abiResponse.json() as Abi;
  if (!Array.isArray(abi) || keccak256(toBytes(canonical(abi))).slice(2) !== contract.abiHash) throw Error('Contract ABI does not match its attestation. Transactions are disabled.');
  const chain = defineChain({
    id: manifest.chainId, name: manifest.network.name, nativeCurrency: manifest.network.nativeCurrency,
    rpcUrls: { default: { http: manifest.network.rpcUrls } },
    blockExplorers: { default: { name: 'Explorer', url: manifest.network.explorer } },
  });
  return { manifest, contract, abi: abi as Abi, chain };
}
export type Config = Awaited<ReturnType<typeof loadConfig>>;
export function publicClient(config: Config, provider?: Injected) {
  const transports = config.manifest.network.rpcUrls.map(url => http(url, { timeout: 8000, retryCount: 1, batch: true }));
  return createPublicClient({ chain: config.chain, transport: fallback([...transports, ...(provider ? [custom(provider, { retryCount: 0 })] : [])], { rank: false, retryCount: 0 }) });
}
export type Client = ReturnType<typeof publicClient>;
