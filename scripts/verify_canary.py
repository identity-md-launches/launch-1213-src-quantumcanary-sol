#!/usr/bin/env python3
"""Re-derive QuantumCanary using Python integer arithmetic and Foundry's Keccak command.

No RPC, third-party Python package, private key, or production Solidity helper is used.
"""

import argparse
import json
from pathlib import Path
import re
import subprocess


def keccak(data: bytes) -> bytes:
    result = subprocess.run(
        ["cast", "keccak", "0x" + data.hex()],
        check=True,
        capture_output=True,
        text=True,
    )
    return bytes.fromhex(result.stdout.strip().removeprefix("0x"))


def derive(phrase: str) -> dict:
    phrase_bytes = phrase.encode("ascii")
    p = (1 << 256) - (1 << 32) - 977
    seed_hash = keccak(phrase_bytes)
    counter = 0
    while True:
        x = int.from_bytes(keccak(seed_hash + counter.to_bytes(32, "big")), "big") % p
        rhs = (x**3 + 7) % p
        y = pow(rhs, (p + 1) // 4, p)
        if y * y % p == rhs:
            if y % 2:
                y = p - y
            public_key = x.to_bytes(32, "big") + y.to_bytes(32, "big")
            address = "0x" + keccak(public_key)[-20:].hex()
            return {
                "seedPhrase": phrase,
                "phraseBytes": len(phrase_bytes),
                "seedHash": "0x" + seed_hash.hex(),
                "counter": counter,
                "pubKeyX": f"0x{x:064x}",
                "pubKeyY": f"0x{y:064x}",
                "canaryAddress": address,
            }
        counter += 1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrase", help="Exact ASCII seed phrase; defaults to the constant in src/QuantumCanary.sol")
    args = parser.parse_args()
    phrase = args.phrase
    if phrase is None:
        source = (Path(__file__).resolve().parents[1] / "src" / "QuantumCanary.sol").read_text(encoding="ascii")
        match = re.search(r'string public constant SEED_PHRASE\s*=\s*"([^"\\]*)"\s*;', source)
        if match is None:
            parser.error("Could not read the literal SEED_PHRASE; pass --phrase explicitly.")
        phrase = match.group(1)
    try:
        print(json.dumps(derive(phrase), indent=2))
    except (UnicodeEncodeError, FileNotFoundError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Verification failed (ASCII phrase and cast are required): {error}\n")


if __name__ == "__main__":
    main()
