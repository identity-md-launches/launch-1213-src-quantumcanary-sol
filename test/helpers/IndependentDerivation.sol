// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @dev Test-only reference: explicit big-endian bytes and square-and-multiply; no precompile or production helper.
library IndependentDerivation {
    uint256 internal constant P = type(uint256).max - (1 << 32) - 976;

    struct Point {
        bytes32 seedHash;
        uint256 x;
        uint256 y;
        uint256 counter;
        address canary;
    }

    function derive(string memory phrase) internal pure returns (Point memory point) {
        point.seedHash = keccak256(bytes(phrase));
        bytes memory input = new bytes(64);
        for (uint256 j; j < 32; ++j) {
            input[j] = point.seedHash[j];
        }
        for (uint256 i;; ++i) {
            for (uint256 j; j < 32; ++j) {
                input[32 + j] = bytes1(uint8(i >> (8 * (31 - j))));
            }
            uint256 x = uint256(keccak256(input)) % P;
            uint256 rhs = addmod(mulmod(x, mulmod(x, x, P), P), 7, P);
            uint256 y = power(rhs, (P + 1) >> 2);
            if (mulmod(y, y, P) != rhs) continue;
            point.x = x;
            point.y = (y & 1) == 0 ? y : P - y;
            point.counter = i;
            bytes memory publicKey = new bytes(64);
            for (uint256 j; j < 32; ++j) {
                publicKey[j] = bytes1(uint8(point.x >> (8 * (31 - j))));
                publicKey[32 + j] = bytes1(uint8(point.y >> (8 * (31 - j))));
            }
            point.canary = address(uint160(uint256(keccak256(publicKey))));
            return point;
        }
    }

    function power(uint256 base, uint256 exponent) internal pure returns (uint256 result) {
        result = 1;
        // Scan from the most significant bit; multiplication never overflows outside the field.
        for (uint256 bit = 1 << 255; bit != 0; bit >>= 1) {
            result = mulmod(result, result, P);
            if ((exponent & bit) != 0) result = mulmod(result, base, P);
        }
    }
}
