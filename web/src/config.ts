import { createPublicClient, defineChain, fallback, http, custom, keccak256, toBytes, isAddress, type Abi, type Address, type EIP1193Provider } from 'viem';

export type Injected = EIP1193Provider & { on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: Injected } }
export type Manifest = {
  version: number; launchId: string; chainId: number; sourceCommit: string; attestationHash: string;
  contracts: { name: string; address: Address; abiHash: string; abiPath: string }[];
  assets: { path: string; sha256: string }[];
  network: { chainId: number; name: string; testnet: boolean; rpcUrls: string[]; explorer: string; nativeCurrency: { name: string; symbol: string; decimals: number }; pairToken: { address: Address; symbol: string; decimals: number } };
  walletAddChain: { chainId: `0x${string}`; chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number }; blockExplorerUrls: string[] };
};
export const site = {
  source: 'https://github.com/identity-md-launches/launch-1213-src-quantumcanary-sol',
  launch: 'https://explorer.imd.fun/jobs/ffb47362-cdd3-498f-8c1c-911c27666c35',
  pollMs: 12_000,
  staleMs: 60_000,
};
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
