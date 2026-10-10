// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IQuantumCanary {
    function isTripped() external view returns (bool);
    function trippedBlock() external view returns (uint256);
}

// Add your own pause policy and recovery process.
abstract contract CanaryGuard {
    IQuantumCanary public constant CANARY =
        IQuantumCanary(
            address(bytes20(hex"626517225096671868609c1bbf9c1b416a4efd9a"))
        );

    bool public quantumAlarm;
    error QuantumAlarm();

    // Anyone can persist the first true reading.
    // Call this in a successful, separate transaction.
    function observeCanary() public {
        if (CANARY.isTripped() || CANARY.trippedBlock() != 0) {
            quantumAlarm = true;
        }
    }

    modifier whenCanaryQuiet() {
        if (quantumAlarm || CANARY.isTripped()
            || CANARY.trippedBlock() != 0) {
            revert QuantumAlarm();
        }
        _;
    }

    // Apply whenCanaryQuiet to sensitive operations.
}
