// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {QuantumCanary} from "src/QuantumCanary.sol";

library CanaryTestUtils {
    function configurationHash(QuantumCanary observer) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                observer.SEED_PHRASE(),
                observer.seedPhrase(),
                observer.seedHash(),
                observer.pubKeyX(),
                observer.pubKeyY(),
                observer.counter(),
                observer.canaryAddress(),
                observer.thresholdWei()
            )
        );
    }

    // Every public entry point, including the constant's generated getter.
    // Keeping poke last lets read-only callers select only getters.
    function entryPoints() internal pure returns (bytes4[13] memory selectors) {
        selectors = [
            bytes4(keccak256("SEED_PHRASE()")),
            bytes4(keccak256("seedPhrase()")),
            bytes4(keccak256("seedHash()")),
            bytes4(keccak256("pubKeyX()")),
            bytes4(keccak256("pubKeyY()")),
            bytes4(keccak256("counter()")),
            bytes4(keccak256("canaryAddress()")),
            bytes4(keccak256("thresholdWei()")),
            bytes4(keccak256("highWaterMark()")),
            bytes4(keccak256("trippedAt()")),
            bytes4(keccak256("trippedBlock()")),
            bytes4(keccak256("isTripped()")),
            QuantumCanary.poke.selector
        ];
    }
}
