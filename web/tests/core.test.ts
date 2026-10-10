import { describe, expect, it, vi } from 'vitest';
import { encodeAbiParameters, keccak256, toBytes } from 'viem';
import { derive, modPow, P, EXPONENT } from '../src/derive';
import { alarmState, errorMessage } from '../src/chain';
import { validAmount } from '../src/Actions';
import { switchChain } from '../src/wallet';
import { canonical, type Config, type Injected } from '../src/config';
import handoff from '../config/deployment.json';
import network from '../config/network.json';
import abi from '../public/abi/QuantumCanary.json';

const phrase = 'IMD Quantum Canary #1 warns that if this balance ever drops, a quantum computer has broken secp256k1.';
describe('independent browser derivation', () => {
  it('reproduces every pinned deployment value', () => {
    const result = derive(phrase);
    expect(result.seedHash).toBe('0x24049af853e3f3a0d855c4dcaaed3fc054dcaae445f08ff572999789ab606655');
    expect(result.counter).toBe(0n);
    expect(result.x).toBe(0xae07cae0c4e680f898fc1655da5e33c66be3bd8ddc07934fcbdadc7d3e674625n);
    expect(result.y).toBe(0x6b5e6d8b021bca37ceaa23d85cefadca41979671e49af160f49b7d27e4b9affan);
    expect(result.address).toBe('0x379C0A5704C211f26eadd26e670246E242Af9e7E');
    expect(result.packed.length).toBe(130);
  });
  it('searches from zero, rejects non-residues and keeps only the first valid even point', () => {
    let rejected = 0;
    for (let i = 0; i < 40; i++) {
      const result = derive(`A public test sentence for independent canary derivation number ${i}.`);
      expect(result.y % 2n).toBe(0n);
      expect(result.y * result.y % P).toBe((result.x * result.x % P * result.x + 7n) % P);
      result.attempts.forEach((a, index) => {
        expect(a.i).toBe(BigInt(index));
        expect(a.encoded).toBe(encodeAbiParameters([{ type: 'bytes32' }, { type: 'uint256' }], [result.seedHash, a.i]));
        expect(a.accepted).toBe(index === result.attempts.length - 1);
        if (!a.accepted) rejected++;
      });
    }
    expect(rejected).toBeGreaterThan(0);
  });
  it('does not trim or normalize the seed', () => {
    expect(derive(phrase + '\n').address).not.toBe(derive(phrase).address);
    expect(EXPONENT).toBe((P + 1n) / 4n);
    expect(modPow(17n, 19n, 31n)).toBe(17n ** 19n % 31n);
  });
});
describe('contract semantics', () => {
  it.each([
    [0n, 0n, false, 'NOT YET FUNDED'], [1n, 0n, false, 'AWAITING POKE'],
    [1n, 1n, false, 'ARMED'], [0n, 1n, true, 'TRIPPED'], [2n, 3n, false, 'ARMED'],
  ])('balance %s / observed mark %s / alarm %s => %s', (balance, highWaterMark, isTripped, expected) => {
    expect(alarmState({ balance, highWaterMark, isTripped, thresholdWei: 1n })).toBe(expected);
  });
  it('binds the complete ABI to the actual handoff', () => {
    expect(keccak256(toBytes(canonical(abi))).slice(2)).toBe(handoff.contracts[0].abiHash);
    expect(handoff.chainId).toBe(network.network.chainId);
    expect(Number(network.walletAddChain.chainId)).toBe(network.network.chainId);
  });
});
describe('wallet and value validation', () => {
  it.each(['0', '-1', '1e3', '0.0000000000000000001', 'NaN', '1,000', '', '01', '1.2.3'])('rejects ambiguous or nonpositive ETH: %s', input => {
    expect(() => validAmount(input)).toThrow();
  });
  it('preserves exact wei including one wei', () => {
    expect(validAmount('0.000000000000000001')).toBe(1n);
    expect(validAmount(' 1.25 ')).toBe(1250000000000000000n);
  });
  it('adds the exact supplied network on 4902, then switches again', async () => {
    let added = false;
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain' && !added) throw { code: 4902 };
      if (method === 'wallet_addEthereumChain') added = true;
      if (method === 'eth_chainId') return '0x1';
      return null;
    });
    const config = { manifest: { ...handoff, ...network } } as unknown as Config;
    await switchChain({ request } as unknown as Injected, config);
    expect(request.mock.calls.map(c => c[0].method)).toEqual(['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain', 'eth_chainId']);
    expect(request.mock.calls[1][0]).toEqual({ method: 'wallet_addEthereumChain', params: [network.walletAddChain] });
  });
  it('does not add a chain after user rejection', async () => {
    const request = vi.fn(async () => { throw { code: 4001 }; });
    await expect(switchChain({ request } as unknown as Injected, { manifest: { ...handoff, ...network } } as unknown as Config)).rejects.toEqual({ code: 4001 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(errorMessage({ code: 4001 })).toContain('declined');
  });
});
