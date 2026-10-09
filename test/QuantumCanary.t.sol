// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {QuantumCanary} from "../src/QuantumCanary.sol";
import {IndependentDerivation} from "./helpers/IndependentDerivation.sol";

contract QuantumCanaryTest is Test {
    uint256 internal constant P = type(uint256).max - (1 << 32) - 976;
    uint256 internal constant THRESHOLD = 1 ether;
    QuantumCanary internal observer;
    address internal canary;

    function setUp() public {
        observer = new QuantumCanary(THRESHOLD);
        canary = observer.canaryAddress();
    }

    function test_SeedPhraseIsAsciiAndHasRequiredPrefixAndLength() public view {
        bytes memory phrase = bytes(observer.seedPhrase());
        bytes memory prefix = bytes("IMD Quantum Canary #1");
        assertGe(phrase.length, 60);
        assertLe(phrase.length, 160);
        for (uint256 i; i < phrase.length; ++i) {
            assertGe(uint8(phrase[i]), 32, "non-printable byte");
            assertLe(uint8(phrase[i]), 126, "non-ASCII byte");
            if (i < prefix.length) assertEq(phrase[i], prefix[i], "wrong prefix");
        }
        assertEq(observer.seedPhrase(), observer.SEED_PHRASE());
        assertEq(observer.seedHash(), keccak256(phrase));
    }

    function test_PointIsOnCurveAndCanonical() public view {
        uint256 x = observer.pubKeyX();
        uint256 y = observer.pubKeyY();
        assertLt(x, P);
        assertLt(y, P);
        assertEq(y % 2, 0, "root must be even");
        assertEq(mulmod(y, y, P), addmod(mulmod(mulmod(x, x, P), x, P), 7, P));
        assertEq(canary.code.length, 0, "canary must start without code");
        assertTrue(canary != address(observer));
    }

    function test_IndependentRederivation() public view {
        IndependentDerivation.Point memory point = IndependentDerivation.derive(observer.seedPhrase());
        assertEq(observer.seedHash(), point.seedHash);
        assertEq(observer.counter(), point.counter, "must accept the FIRST valid candidate");
        assertEq(observer.pubKeyX(), point.x);
        assertEq(observer.pubKeyY(), point.y);
        assertEq(canary, point.canary);
    }

    function test_ConstructorEmitsCompleteDerivation() public {
        vm.expectEmit(true, true, false, true);
        emit QuantumCanary.CanaryDerived(
            observer.seedHash(), canary, observer.pubKeyX(), observer.pubKeyY(), observer.counter(), THRESHOLD
        );
        new QuantumCanary(THRESHOLD);
    }

    function test_RevertWhenThresholdIsZero() public {
        vm.expectRevert(QuantumCanary.InvalidThreshold.selector);
        new QuantumCanary(0);
    }

    function test_UnfundedAndUnarmedDropsNeverTrip() public {
        assertFalse(observer.isTripped());
        observer.poke();
        vm.deal(canary, THRESHOLD - 1);
        observer.poke();
        vm.deal(canary, 0);
        observer.poke();
        assertFalse(observer.isTripped());
        assertEq(observer.highWaterMark(), THRESHOLD - 1);
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
    }

    function test_UnobservedFundingDoesNotArm() public {
        vm.deal(canary, THRESHOLD);
        assertFalse(observer.isTripped());
        assertEq(observer.highWaterMark(), 0);
        vm.deal(canary, 0);
        observer.poke();
        assertFalse(observer.isTripped(), "a view cannot reconstruct past balances");
        assertEq(observer.trippedAt(), 0);
    }

    function test_ConstructorRecordsPrefundedCanary() public {
        vm.deal(canary, 2 ether);
        QuantumCanary prefunded = new QuantumCanary(THRESHOLD);
        assertEq(prefunded.canaryAddress(), canary);
        assertEq(prefunded.highWaterMark(), 2 ether);
        assertFalse(prefunded.isTripped());
        vm.deal(canary, THRESHOLD - 1);
        assertTrue(prefunded.isTripped(), "constructor observation should arm without a poke");
        assertFalse(observer.isTripped(), "observers have independent observation histories");
    }

    function test_ThresholdBoundaryAndLiveAlarmWithoutPoke() public {
        vm.deal(canary, 2 ether);
        observer.poke();
        vm.deal(canary, THRESHOLD);
        assertFalse(observer.isTripped(), "exact threshold is not below it");
        vm.deal(canary, THRESHOLD - 1);
        (bool success, bytes memory result) = address(observer).staticcall(abi.encodeCall(observer.isTripped, ()));
        assertTrue(success);
        assertTrue(abi.decode(result, (bool)));
        assertEq(observer.trippedAt(), 0, "the live read must not record history");
        assertEq(observer.trippedBlock(), 0);
        assertEq(observer.highWaterMark(), 2 ether);
    }

    function test_PokeEmitsOnlyForNewHighWaterMarks() public {
        vm.deal(canary, THRESHOLD);
        vm.expectEmit(false, false, false, true, address(observer));
        emit QuantumCanary.HighWaterMarkUpdated(0, THRESHOLD);
        observer.poke();
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 0, "same balance is a no-op");
        vm.deal(canary, 2 ether);
        vm.expectEmit(false, false, false, true, address(observer));
        emit QuantumCanary.HighWaterMarkUpdated(THRESHOLD, 2 ether);
        observer.poke();
        vm.deal(canary, THRESHOLD);
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 0);
        assertEq(observer.highWaterMark(), 2 ether, "high-water mark cannot decrease");
    }

    function test_FirstTripRecordedOnceAcrossRefillsAndLaterDrops() public {
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.warp(1000);
        vm.roll(100);
        vm.deal(canary, THRESHOLD - 1);
        vm.expectEmit(false, false, false, true, address(observer));
        emit QuantumCanary.CanaryTripped(THRESHOLD - 1, THRESHOLD, 1000, 100);
        observer.poke();
        assertTrue(observer.isTripped());
        vm.warp(2000);
        vm.roll(200);
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 0, "trip must only emit once");

        vm.deal(canary, 3 ether);
        assertFalse(observer.isTripped(), "isTripped is live, not latched");
        observer.poke();
        assertEq(observer.highWaterMark(), 3 ether);
        vm.deal(canary, 0);
        assertTrue(observer.isTripped());
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 0, "a later drop cannot emit a second trip");
        assertEq(observer.trippedAt(), 1000);
        assertEq(observer.trippedBlock(), 100);
    }

    function test_TransientDropCanBeMissedIfRefilledBeforePoke() public {
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.deal(canary, 0);
        assertTrue(observer.isTripped());
        vm.deal(canary, THRESHOLD);
        observer.poke();
        assertFalse(observer.isTripped());
        assertEq(observer.trippedAt(), 0, "poke records observations, not unseen history");
    }

    function test_TripAtTimestampAndBlockZeroCannotBeOverwritten() public {
        vm.deal(canary, THRESHOLD);
        observer.poke();
        vm.warp(0);
        vm.roll(0);
        vm.deal(canary, 0);
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 1);
        vm.warp(100);
        vm.roll(100);
        vm.recordLogs();
        observer.poke();
        assertEq(vm.getRecordedLogs().length, 0);
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
    }

    function test_RealDonationGoesDirectlyToCanary() public {
        vm.deal(address(this), THRESHOLD);
        (bool success,) = canary.call{value: THRESHOLD}("");
        assertTrue(success);
        observer.poke();
        assertEq(canary.balance, THRESHOLD);
        assertEq(observer.highWaterMark(), THRESHOLD);
        assertEq(address(observer).balance, 0);
        assertEq(address(this).balance, 0);
    }

    function test_AllEntryPointsRejectValueAndCannotMoveFunds() public {
        bytes[] memory calls = _entryPoints();
        vm.deal(address(this), 1 ether);
        vm.deal(canary, 5 ether);
        bytes32 immutableHash = _immutableHash();
        for (uint256 i; i < calls.length; ++i) {
            (bool rejected,) = address(observer).call{value: 1}(calls[i]);
            assertFalse(rejected, "entry point accepted ETH");
            (bool success,) = address(observer).call(calls[i]);
            assertTrue(success, "documented entry point should work without ETH");
            assertEq(canary.balance, 5 ether, "entry point moved the bounty");
            assertEq(address(observer).balance, 0);
            assertEq(address(this).balance, 1 ether);
            assertEq(_immutableHash(), immutableHash);
        }
        (bool emptyCall,) = address(observer).call("");
        assertFalse(emptyCall, "there must be no fallback");
        (bool emptyValue,) = address(observer).call{value: 1}("");
        assertFalse(emptyValue, "there must be no receive function");
    }

    function test_ConstructorRejectsValue() public {
        vm.deal(address(this), 1);
        bytes memory initcode = abi.encodePacked(type(QuantumCanary).creationCode, abi.encode(THRESHOLD));
        address deployed;
        assembly ("memory-safe") {
            deployed := create(1, add(initcode, 32), mload(initcode))
        }
        assertEq(deployed, address(0));
        assertEq(address(this).balance, 1);
    }

    function test_ForcedObserverBalanceIsIgnoredAndCannotBeSwept() public {
        // EVM balance credits cannot be rejected by a recipient; vm.deal models that exceptional credit.
        vm.deal(address(observer), 10 ether);
        observer.poke();
        assertEq(observer.highWaterMark(), 0, "only the canary balance counts");
        assertFalse(observer.isTripped());
        (bool success,) = address(observer).call(abi.encodeWithSignature("withdraw(address)", address(this)));
        assertFalse(success);
        assertEq(address(observer).balance, 10 ether, "no sweep path exists");
    }

    function test_RuntimeHasNoCallsTransfersCreationOrEscapeOpcodes() public view {
        bytes memory runtime = address(observer).code;
        assertGt(runtime.length, 0);
        assertLe(runtime.length, 24_576);
        for (uint256 i; i < runtime.length; ++i) {
            uint8 op = uint8(runtime[i]);
            if (op >= 0x60 && op <= 0x7f) {
                i += op - 0x5f;
                continue;
            }
            assertTrue(
                op != 0xf0 && op != 0xf1 && op != 0xf2 && op != 0xf4 && op != 0xf5 && op != 0xfa && op != 0xff,
                "runtime can call, create, delegate or destroy"
            );
        }
    }

    function test_RevertWhenModexpFails() public {
        vm.mockCallRevert(address(0x05), bytes(""), bytes("precompile unavailable"));
        vm.expectRevert(QuantumCanary.ModExpFailed.selector);
        new QuantumCanary(THRESHOLD);
    }

    function test_RevertWhenModexpReturnsMalformedOutput() public {
        vm.mockCall(address(0x05), bytes(""), hex"01");
        vm.expectRevert(QuantumCanary.ModExpFailed.selector);
        new QuantumCanary(THRESHOLD);
    }

    function test_Create2FactoryDeploymentWorksOnEmptyChain() public {
        vm.chainId(1);
        bytes memory initcode = abi.encodePacked(type(QuantumCanary).creationCode, abi.encode(THRESHOLD));
        bytes32 salt = keccak256("local deployment rehearsal");
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(initcode)))))
        );
        address deployed;
        assembly ("memory-safe") {
            deployed := create2(0, add(initcode, 32), mload(initcode), salt)
        }
        assertEq(deployed, predicted);
        assertGt(deployed.code.length, 0);
        QuantumCanary rehearsal = QuantumCanary(deployed);
        assertEq(rehearsal.thresholdWei(), THRESHOLD);
        assertEq(rehearsal.canaryAddress(), canary);
        assertEq(rehearsal.pubKeyX(), observer.pubKeyX());
        assertEq(rehearsal.pubKeyY(), observer.pubKeyY());
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_ThresholdBoundaryAndImmutableDerivation(uint256 threshold) public {
        threshold = threshold == 0 ? 1 : threshold;
        QuantumCanary candidate = new QuantumCanary(threshold);
        assertEq(candidate.thresholdWei(), threshold);
        assertEq(candidate.canaryAddress(), canary);
        assertEq(candidate.seedHash(), observer.seedHash());
        assertEq(candidate.pubKeyX(), observer.pubKeyX());
        assertEq(candidate.pubKeyY(), observer.pubKeyY());
        assertEq(candidate.counter(), observer.counter());
        vm.deal(canary, threshold);
        candidate.poke();
        assertFalse(candidate.isTripped());
        assertEq(candidate.highWaterMark(), threshold);
        vm.deal(canary, threshold - 1);
        assertTrue(candidate.isTripped());
        candidate.poke();
        assertEq(candidate.trippedAt(), block.timestamp);
        assertEq(candidate.trippedBlock(), block.number);
        assertEq(canary.balance, threshold - 1);
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_AnyCallerCanPokeWithoutMovingFunds(address caller, uint256 balance) public {
        vm.deal(canary, balance);
        bytes32 immutableHash = _immutableHash();
        vm.prank(caller);
        observer.poke();
        assertEq(observer.highWaterMark(), balance);
        assertEq(canary.balance, balance);
        assertEq(address(observer).balance, 0);
        assertEq(_immutableHash(), immutableHash);
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_UnknownSelectorCannotMoveFundsOrChangeConfiguration(bytes4 selector, bytes memory args) public {
        bytes[] memory calls = _entryPoints();
        for (uint256 i; i < calls.length; ++i) {
            vm.assume(selector != bytes4(calls[i]));
        }
        vm.deal(canary, 3 ether);
        bytes32 immutableHash = _immutableHash();
        (bool success,) = address(observer).call(abi.encodePacked(selector, args));
        assertFalse(success);
        assertEq(canary.balance, 3 ether);
        assertEq(address(observer).balance, 0);
        assertEq(_immutableHash(), immutableHash);
        assertEq(observer.highWaterMark(), 0);
    }

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_ObservationSequence(uint256 threshold, uint256[16] memory balances, uint16 pokeMask) public {
        threshold = threshold == 0 ? 1 : threshold;
        QuantumCanary candidate = new QuantumCanary(threshold);
        uint256 observedMaximum;
        uint256 firstTime;
        uint256 firstBlock;
        bool recorded;
        for (uint256 i; i < balances.length; ++i) {
            vm.warp(1000 + i);
            vm.roll(100 + i);
            vm.deal(canary, balances[i]);
            assertEq(candidate.isTripped(), observedMaximum >= threshold && balances[i] < threshold);
            if ((uint256(pokeMask) & (uint256(1) << i)) != 0) {
                candidate.poke();
                if (balances[i] > observedMaximum) observedMaximum = balances[i];
                if (!recorded && observedMaximum >= threshold && balances[i] < threshold) {
                    firstTime = 1000 + i;
                    firstBlock = 100 + i;
                    recorded = true;
                }
            }
            assertEq(candidate.highWaterMark(), observedMaximum);
            assertEq(candidate.trippedAt(), firstTime);
            assertEq(candidate.trippedBlock(), firstBlock);
            assertEq(candidate.isTripped(), observedMaximum >= threshold && balances[i] < threshold);
            assertEq(canary.balance, balances[i]);
            assertEq(address(candidate).balance, 0);
        }
    }

    function _immutableHash() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                observer.seedPhrase(),
                observer.seedHash(),
                observer.canaryAddress(),
                observer.pubKeyX(),
                observer.pubKeyY(),
                observer.counter(),
                observer.thresholdWei()
            )
        );
    }

    function _entryPoints() internal pure returns (bytes[] memory calls) {
        calls = new bytes[](13);
        calls[0] = abi.encodeWithSignature("SEED_PHRASE()");
        calls[1] = abi.encodeWithSignature("seedPhrase()");
        calls[2] = abi.encodeWithSignature("seedHash()");
        calls[3] = abi.encodeWithSignature("canaryAddress()");
        calls[4] = abi.encodeWithSignature("pubKeyX()");
        calls[5] = abi.encodeWithSignature("pubKeyY()");
        calls[6] = abi.encodeWithSignature("counter()");
        calls[7] = abi.encodeWithSignature("thresholdWei()");
        calls[8] = abi.encodeWithSignature("highWaterMark()");
        calls[9] = abi.encodeWithSignature("trippedAt()");
        calls[10] = abi.encodeWithSignature("trippedBlock()");
        calls[11] = abi.encodeWithSignature("isTripped()");
        calls[12] = abi.encodeWithSignature("poke()");
    }
}
