import { hex32 } from './derive';

/** SEC 1 encodings of the point returned by pubKeyX() and pubKeyY(). */
export function publicKey(x: bigint, y: bigint) {
  const xHex = hex32(x);
  const yHex = hex32(y);
  return {
    x: xHex,
    y: yHex,
    uncompressed: `0x04${xHex.slice(2)}${yHex.slice(2)}`,
    compressed: `0x${y % 2n === 0n ? '02' : '03'}${xHex.slice(2)}`,
  };
}
