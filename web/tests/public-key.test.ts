import { describe, expect, it } from 'vitest';
import { publicKey } from '../src/public-key';
import { derive, hex32, P } from '../src/derive';
import { derivationTranscript } from '../src/Verify';
import { verificationPrompt } from '../src/VerificationGuide';
import type { Snapshot } from '../src/chain';
import { site, type Config } from '../src/config';
import handoff from '../config/deployment.json';
import network from '../config/network.json';

const result = derive(site.seedPhrase);
const snapshot = {
  seedPhrase: site.seedPhrase, seedHash: result.seedHash, counter: result.counter,
  pubKeyX: result.x, pubKeyY: result.y, canaryAddress: result.address, block: 26158146n,
} as Snapshot;
const config = { contract: handoff.contracts[0], manifest: { ...handoff, ...network } } as unknown as Config;

describe('published public point', () => {
  it('encodes the expected even point in 65 and 33 bytes', () => {
    const key = publicKey(snapshot.pubKeyX, snapshot.pubKeyY);
    expect(key.uncompressed).toBe(`0x04${result.packed.slice(2)}`);
    expect(key.compressed).toBe(`0x02${hex32(result.x).slice(2)}`);
    expect((key.uncompressed.length - 2) / 2).toBe(65);
    expect((key.compressed.length - 2) / 2).toBe(33);
  });
  it('uses odd parity for the other root and retains leading zero bytes', () => {
    expect(publicKey(result.x, P - result.y).compressed).toBe(`0x03${hex32(result.x).slice(2)}`);
    const small = publicKey(1n, 2n); // Encoding fixture only, not a deployed point.
    expect(small.x).toBe(`0x${'0'.repeat(63)}1`);
    expect(small.y).toBe(`0x${'0'.repeat(63)}2`);
    expect(small.uncompressed.length).toBe(132);
    expect(small.compressed.length).toBe(68);
  });
  it('prints a single uncompressed-key transcript row immediately after the address', () => {
    const lines = derivationTranscript(snapshot, result).map(row => row.text);
    const address = lines.findIndex(line => line.startsWith('address '));
    expect(lines[address + 1]).toBe(`uncompressed key ${publicKey(result.x, result.y).uncompressed}`);
    expect(lines[address + 1]).not.toContain('\n');
  });
});

describe('independent AI prompt', () => {
  it('keeps the exact sentence, all getter values and required references', () => {
    expect(new TextEncoder().encode(snapshot.seedPhrase)).toHaveLength(101);
    const prompt = verificationPrompt(snapshot, config);
    expect(prompt).toContain(`Sentence (exact, 101 ASCII bytes, no trailing newline): ${snapshot.seedPhrase}. Procedure:`);
    expect(prompt).toContain('Ethereum Keccak-256, not SHA3-256.');
    expect(prompt).toContain('64 bytes, no 04 prefix.');
    expect(prompt).toContain(`seedHash() = ${snapshot.seedHash}, counter() = 0, pubKeyX() = ${hex32(result.x)}, pubKeyY() = ${hex32(result.y)}, canaryAddress() = ${snapshot.canaryAddress}.`);
    expect(prompt).toContain(`${network.network.explorer}/address/${config.contract.address}#readContract`);
    expect(prompt).toContain(site.contractSource);
    expect(prompt).toContain(site.launch);
    expect(prompt).not.toContain('\n');
    expect(prompt).not.toMatch(/<seedPhrase|<seedHash|<counter|<x>|<y>|<address>/);
  });
  it('uses every supplied getter rather than local recomputation or pinned expected values', () => {
    const other = derive('This sentence is a unit test fixture, never a deployment or runtime fallback.');
    const changed = { ...snapshot, seedPhrase: ' A changed test sentence.\n', seedHash: other.seedHash, counter: 19n, pubKeyX: other.x, pubKeyY: P - other.y, canaryAddress: other.address };
    const prompt = verificationPrompt(changed, config);
    for (const value of [changed.seedPhrase, changed.seedHash, 'counter() = 19', hex32(changed.pubKeyX), hex32(changed.pubKeyY), changed.canaryAddress]) expect(prompt).toContain(value);
    for (const value of [snapshot.seedPhrase, snapshot.seedHash, hex32(snapshot.pubKeyX), hex32(snapshot.pubKeyY), snapshot.canaryAddress]) expect(prompt).not.toContain(value);
  });
});
