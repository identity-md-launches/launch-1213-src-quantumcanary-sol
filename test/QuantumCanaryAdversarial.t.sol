// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {QuantumCanary} from "src/QuantumCanary.sol";
import {IndependentDerivation} from "./helpers/IndependentDerivation.sol";
import {CanaryTestUtils} from "./helpers/CanaryTestUtils.sol";

contract QuantumCanaryAdversarialTest is Test {
    uint256 private constant P = 2 ** 256 - 2 ** 32 - 977;
    uint256 private constant THRESHOLD = 1 ether;
    QuantumCanary private observer;
    address private canary;

    function setUp() public {
        observer = new QuantumCanary(THRESHOLD);
        canary = observer.canaryAddress();
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_IndependentPointIgnoresDeploymentContext(
        uint256 threshold,
        address deployer,
        uint64 chainId,
        uint64 timestamp,
        uint64 blockNumber,
        uint96 prefunding
    ) public {
        threshold = bound(threshold, 1, type(uint256).max);
        // This helper hashes the phrase and searches from zero with pure Solidity
        // square-and-multiply and explicit byte encoding, never the precompile.
        IndependentDerivation.Point memory expected = IndependentDerivation.derive(observer.seedPhrase());
        vm.deal(expected.canary, prefunding);
        vm.chainId(chainId);
        vm.warp(timestamp);
        vm.roll(blockNumber);

        vm.prank(deployer);
        QuantumCanary deployed = new QuantumCanary(threshold);
        assertEq(deployed.seedHash(), expected.seedHash);
        assertEq(deployed.pubKeyX(), expected.x);
        assertEq(deployed.pubKeyY(), expected.y);
        assertEq(deployed.counter(), expected.counter, "must use the first valid counter");
        assertEq(deployed.canaryAddress(), expected.canary);
        assertEq(deployed.thresholdWei(), threshold);
        assertEq(deployed.highWaterMark(), prefunding);
        assertLt(expected.x, P);
        assertLt(expected.y, P);
        assertEq(expected.y & 1, 0);
        assertEq(
            mulmod(expected.y, expected.y, P), addmod(mulmod(expected.x, mulmod(expected.x, expected.x, P), P), 7, P)
        );
        assertFalse(deployed.isTripped());
        assertEq(address(deployed).balance, 0);
    }

    function test_ModexpReceivesEveryExactCandidateThroughFirstValidPoint() public {
        IndependentDerivation.Point memory expected = IndependentDerivation.derive(observer.seedPhrase());
        for (uint256 i; i <= expected.counter; ++i) {
            uint256 x = uint256(keccak256(abi.encode(expected.seedHash, i))) % P;
            uint256 rhs = addmod(mulmod(x, mulmod(x, x, P), P), 7, P);
            bytes memory input = abi.encode(uint256(32), uint256(32), uint256(32), rhs, (P + 1) / 4, P);
            vm.expectCall(address(5), input, uint64(1));
        }
        QuantumCanary deployed = new QuantumCanary(THRESHOLD);
        assertEq(deployed.pubKeyX(), expected.x);
        assertEq(deployed.pubKeyY(), expected.y);
        assertEq(deployed.canaryAddress(), expected.canary);
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_PrefundedThresholdEdges(uint256 threshold) public {
        threshold = bound(threshold, 1, type(uint256).max);
        _checkPrefundedBoundary(threshold);
    }

    function test_PrefundedThresholdOneWei() public {
        _checkPrefundedBoundary(1);
    }

    function test_PrefundedThresholdMaximumUint256() public {
        _checkPrefundedBoundary(type(uint256).max);
    }

    function _checkPrefundedBoundary(uint256 threshold) private {
        vm.deal(canary, threshold);
        QuantumCanary deployed = new QuantumCanary(threshold);
        bytes32 configuration = CanaryTestUtils.configurationHash(deployed);
        assertEq(deployed.highWaterMark(), threshold);
        assertFalse(deployed.isTripped(), "equality must arm without tripping");

        // Quantum theft is simulated only by the cheatcode, never a production call.
        vm.deal(canary, threshold - 1);
        assertTrue(deployed.isTripped(), "prefunding must arm the live view without any poke");
        assertEq(deployed.trippedAt(), 0);
        assertEq(deployed.trippedBlock(), 0);
        vm.warp(123456);
        vm.roll(9876);
        vm.expectEmit(false, false, false, true, address(deployed));
        emit QuantumCanary.CanaryTripped(threshold - 1, threshold, 123456, 9876);
        deployed.poke();
        assertEq(deployed.trippedAt(), 123456);
        assertEq(deployed.trippedBlock(), 9876);

        vm.deal(canary, threshold);
        deployed.poke();
        assertFalse(deployed.isTripped(), "refill clears the specified live predicate");
        vm.warp(123457);
        vm.roll(9877);
        vm.deal(canary, 0);
        vm.recordLogs();
        deployed.poke();
        assertEq(vm.getRecordedLogs().length, 0, "recorded theft cannot emit again");
        assertTrue(deployed.isTripped());
        assertEq(deployed.highWaterMark(), threshold);
        assertEq(deployed.trippedAt(), 123456);
        assertEq(deployed.trippedBlock(), 9876);
        assertEq(CanaryTestUtils.configurationHash(deployed), configuration);
        assertEq(canary.balance, 0);
        assertEq(address(deployed).balance, 0);
    }

    function test_TwoObserversShareTheBountyButNotThresholdsOrHistory() public {
        QuantumCanary higher = new QuantumCanary(2 ether);
        assertEq(higher.canaryAddress(), canary);
        vm.deal(canary, 2 ether);
        observer.poke();
        higher.poke();
        vm.deal(canary, 1 ether);
        assertFalse(observer.isTripped());
        assertTrue(higher.isTripped());
        vm.warp(42);
        vm.roll(24);
        higher.poke();
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
        assertEq(higher.trippedAt(), 42);
        assertEq(higher.trippedBlock(), 24);

        vm.deal(canary, 0);
        assertTrue(observer.isTripped());
        vm.warp(43);
        vm.roll(25);
        observer.poke();
        assertEq(observer.trippedAt(), 43);
        assertEq(observer.trippedBlock(), 25);
        assertEq(higher.trippedAt(), 42);
        assertEq(higher.trippedBlock(), 24);
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_MalformedModexpReturnLengthsRevert(uint16 rawLength) public {
        uint256 length = bound(rawLength, 0, 256);
        if (length == 32) length = 33;
        vm.mockCall(address(5), bytes(""), new bytes(length));
        vm.expectRevert(QuantumCanary.ModExpFailed.selector);
        new QuantumCanary(THRESHOLD);
    }

    function test_RuntimeWorksEvenWhenModexpIsUnavailable() public {
        bytes32 configuration = CanaryTestUtils.configurationHash(observer);
        vm.mockCallRevert(address(5), bytes(""), bytes("unavailable after deployment"));
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.deal(canary, 0);
        assertTrue(observer.isTripped());
        observer.poke();
        assertEq(observer.highWaterMark(), THRESHOLD);
        assertEq(observer.trippedAt(), block.timestamp);
        assertEq(observer.trippedBlock(), block.number);
        assertEq(CanaryTestUtils.configurationHash(observer), configuration);
    }

    function test_GettersDoNotWriteStorageOrRecordPendingTrip() public {
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.deal(canary, 0);
        bytes4[13] memory selectors = CanaryTestUtils.entryPoints();
        vm.record();
        vm.recordLogs();
        for (uint256 i; i < selectors.length - 1; ++i) {
            (bool success,) = address(observer).staticcall(abi.encodePacked(selectors[i]));
            assertTrue(success);
        }
        (, bytes32[] memory writes) = vm.accesses(address(observer));
        assertEq(writes.length, 0);
        assertEq(vm.getRecordedLogs().length, 0);
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
        assertTrue(observer.isTripped());
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_ValueCallsCannotRecordPendingTrip(uint96 value) public {
        value = uint96(bound(value, 1, type(uint96).max));
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.deal(canary, THRESHOLD - 1);
        vm.deal(address(this), value);
        bytes4[13] memory selectors = CanaryTestUtils.entryPoints();
        bytes32 configuration = CanaryTestUtils.configurationHash(observer);
        vm.recordLogs();
        for (uint256 i; i < selectors.length; ++i) {
            (bool success,) = address(observer).call{value: value}(abi.encodePacked(selectors[i]));
            assertFalse(success, "a value-bearing call must revert before doing any work");
        }
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertEq(observer.highWaterMark(), THRESHOLD);
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
        assertTrue(observer.isTripped());
        assertEq(canary.balance, THRESHOLD - 1);
        assertEq(address(this).balance, value);
        assertEq(address(observer).balance, 0);
        assertEq(CanaryTestUtils.configurationHash(observer), configuration);
    }
}
