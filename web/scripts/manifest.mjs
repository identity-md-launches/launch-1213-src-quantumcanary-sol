import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { keccak256, toBytes } from 'viem';

const root = resolve(import.meta.dirname, '../..');
const dist = resolve(root, 'dist');
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const handoff = await read(resolve(root, 'web/config/deployment.json'));
const network = await read(resolve(root, 'web/config/network.json'));
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const contracts = [];
for (const c of handoff.contracts) {
  const abiPath = `abi/${c.name}.json`;
  const abi = await read(resolve(dist, abiPath));
  if (!Array.isArray(abi)) throw Error('ABI must be a raw array');
  const hash = keccak256(toBytes(canonical(abi))).slice(2);
  if (hash !== c.abiHash) throw Error(`ABI hash mismatch: ${c.name}: ${hash}`);
  contracts.push({ name: c.name, address: c.address, abiHash: c.abiHash, abiPath });
}
async function inventory(dir) {
  const entries = [];
  for (const name of (await readdir(dir)).sort()) {
    const path = resolve(dir, name);
    if ((await stat(path)).isDirectory()) entries.push(...await inventory(path));
    else if (path !== resolve(dist, 'imd-deployment.json')) {
      const bytes = await readFile(path);
      if (bytes.length > 8388608) throw Error('Exported asset exceeds 8 MiB');
      entries.push({ path: relative(dist, path), sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return entries;
}
const assets = await inventory(dist);
if (assets.length > 128) throw Error('Too many exported assets');
const manifest = {
  version: 1, launchId: handoff.launchId, chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit, attestationHash: handoff.attestationHash,
  contracts, assets, ...network,
  ...(handoff.poolKey ? { poolKey: handoff.poolKey } : {}),
};
if (process.argv.includes('--check')) {
  if (canonical(await read(resolve(dist, 'imd-deployment.json'))) !== canonical(manifest)) throw Error('Manifest differs from handoff or final asset hashes');
} else await writeFile(resolve(dist, 'imd-deployment.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Deployment manifest verified: ${contracts.length} contract(s), ${assets.length} assets; ABI and SHA-256 hashes match.`);
