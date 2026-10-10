import { keccak256, toBytes, getAddress, type Hex } from 'viem';

// Curve arithmetic is ordinary JavaScript BigInt. Viem provides only Keccak
// and the EIP-55 display checksum, never private-key or curve derivation.
export const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const EXPONENT = (P + 1n) / 4n;
export const hex32 = (n: bigint): Hex => `0x${n.toString(16).padStart(64, '0')}`;
export function modPow(base: bigint, exponent: bigint, modulus: bigint) {
  let result = 1n;
  base %= modulus;
  while (exponent > 0n) {
    if (exponent & 1n) result = (result * base) % modulus;
    base = (base * base) % modulus;
    exponent >>= 1n;
  }
  return result;
}
export type Attempt = { i: bigint; encoded: Hex; digest: Hex; x: bigint; rhs: bigint; candidateY: bigint; square: bigint; accepted: boolean };
export type Derivation = { seedHash: Hex; attempts: Attempt[]; x: bigint; y: bigint; counter: bigint; packed: Hex; digest: Hex; address: Hex };
export function derive(phrase: string): Derivation {
  const seedHash = keccak256(toBytes(phrase));
  const attempts: Attempt[] = [];
  // Bounded work protects the UI against a corrupt provider response. An
  // exhausted search is an error, never a partial verification result.
  for (let i = 0n; i < 4096n; i++) {
    const encoded: Hex = `${seedHash}${hex32(i).slice(2)}`;
    const digest = keccak256(encoded);
    const x = BigInt(digest) % P;
    const rhs = (x * x % P * x + 7n) % P;
    const candidateY = modPow(rhs, EXPONENT, P);
    const square = candidateY * candidateY % P;
    const accepted = square === rhs;
    attempts.push({ i, encoded, digest, x, rhs, candidateY, square, accepted });
    if (!accepted) continue;
    const y = candidateY % 2n === 1n ? P - candidateY : candidateY;
    const packed: Hex = `${hex32(x)}${hex32(y).slice(2)}`;
    const pointHash = keccak256(packed);
    return { seedHash, attempts, x, y, counter: i, packed, digest: pointHash, address: getAddress(`0x${pointHash.slice(-40)}`) };
  }
  throw Error('No valid point within 4,096 attempts. Verification did not complete.');
}
