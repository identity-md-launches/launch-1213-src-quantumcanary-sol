// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {QuantumCanary} from "src/QuantumCanary.sol";
import {IndependentDerivation} from "./helpers/IndependentDerivation.sol";
import {CanaryTestUtils} from "./helpers/CanaryTestUtils.sol";

/// @dev Only the handler's explicit funding/theft actions may alter the bounty.
/// Observations are saved as a history so invariants can reconstruct the required
/// state without using the observer's state as their expected value.
contract QuantumCanaryHandler is Test {
    struct Observation {
        uint256 balance;
        uint256 timestamp;
        uint256 blockNumber;
    }

    QuantumCanary public immutable observer;
    address public immutable canary;
    uint256 public constant THRESHOLD = 1 ether;
    uint256 public totalFunded;
    uint256 public totalSimulatedTheft;
    uint256 public forcedObserverCredits;
    uint256 public emittedTripCount;
    uint256 public emittedMarkCount;
    uint256 public lastEmittedMark;
    Observation[] private observations;

    constructor(QuantumCanary observer_) {
        observer = observer_;
        canary = observer_.canaryAddress();
        // The harness deploys on an empty local chain at timestamp/block zero.
        observations.push(Observation(0, 0, 0));
    }

    function history() external view returns (Observation[] memory) {
        return observations;
    }

    function donate(uint96 rawAmount) external {
        uint256 amount = bound(rawAmount, 0, 4 ether);
        vm.deal(address(this), amount);
        (bool success,) = canary.call{value: amount}("");
        assertTrue(success, "donations must reach the derived address");
        totalFunded += amount;
    }

    function simulateBalance(uint8 boundary, uint96 rawBalance) external {
        uint256 balance;
        uint256 choice = boundary % 6;
        if (choice == 0) balance = 0;
        else if (choice == 1) balance = THRESHOLD - 1;
        else if (choice == 2) balance = THRESHOLD;
        else if (choice == 3) balance = THRESHOLD + 1;
        else if (choice == 4) balance = 2 * THRESHOLD;
        else balance = bound(rawBalance, 0, 8 ether);

        uint256 previous = totalFunded - totalSimulatedTheft;
        if (balance >= previous) totalFunded += balance - previous;
        else totalSimulatedTheft += previous - balance;
        // A decreasing vm.deal simulates quantum theft; it is not a contract API.
        vm.deal(canary, balance);
    }

    function poke(address caller) external {
        // Capture inputs before the call, independently of any observer outputs.
        uint256 balance = totalFunded - totalSimulatedTheft;
        observations.push(Observation(balance, block.timestamp, block.number));
        vm.recordLogs();
        vm.prank(caller);
        observer.poke();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            assertEq(logs[i].emitter, address(observer));
            assertEq(logs[i].topics.length, 1);
            if (logs[i].topics[0] == keccak256("HighWaterMarkUpdated(uint256,uint256)")) {
                (uint256 previous, uint256 next) = abi.decode(logs[i].data, (uint256, uint256));
                assertEq(previous, lastEmittedMark);
                assertEq(next, balance);
                assertGt(next, previous);
                lastEmittedMark = next;
                ++emittedMarkCount;
            } else {
                assertEq(logs[i].topics[0], keccak256("CanaryTripped(uint256,uint256,uint256,uint256)"));
                (uint256 liveBalance, uint256 mark, uint256 timestamp, uint256 blockNumber) =
                    abi.decode(logs[i].data, (uint256, uint256, uint256, uint256));
                assertEq(liveBalance, balance);
                assertEq(mark, lastEmittedMark);
                assertEq(timestamp, block.timestamp);
                assertEq(blockNumber, block.number);
                ++emittedTripCount;
            }
        }
    }

    function readGetter(uint8 index) external view {
        bytes4[13] memory selectors = CanaryTestUtils.entryPoints();
        (bool success,) = address(observer).staticcall(abi.encodePacked(selectors[index % 12]));
        assertTrue(success, "a documented getter must remain readable in every state");
    }

    function rejectedValueCall(uint8 index, uint96 rawValue) external {
        uint256 value = bound(rawValue, 1, 4 ether);
        bytes4[13] memory selectors = CanaryTestUtils.entryPoints();
        vm.deal(address(this), value);
        (bool success,) = address(observer).call{value: value}(abi.encodePacked(selectors[index % 13]));
        assertFalse(success, "every entry point must reject ETH");
        assertEq(address(this).balance, value, "rejection must refund the caller");
        vm.deal(address(this), 0);
    }

    function rejectedShortCall(bytes3 input, uint8 rawLength) external {
        bytes memory data = new bytes(rawLength % 4);
        for (uint256 i; i < data.length; ++i) {
            data[i] = input[i];
        }
        (bool success,) = address(observer).call(data);
        assertFalse(success, "no receive or fallback path may accept short calldata");
    }

    function forceObserverCredit(uint96 rawAmount) external {
        // ETH can be forced to any recipient. It must stay separate from the bounty
        // and cannot be spent by any observer entry point, including poke().
        forcedObserverCredits += bound(rawAmount, 0, 4 ether);
        vm.deal(address(observer), forcedObserverCredits);
    }

    function advanceClock(uint32 secondsForward, uint16 blocksForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 1, 1 days));
        vm.roll(block.number + bound(blocksForward, 1, 256));
    }
}

contract QuantumCanaryInvariantTest is Test {
    uint256 private constant THRESHOLD = 1 ether;
    QuantumCanary private observer;
    QuantumCanaryHandler private handler;
    address private canary;
    bytes32 private originalConfiguration;
    bytes32 private originalCodeHash;

    function setUp() public {
        vm.warp(0);
        vm.roll(0);
        observer = new QuantumCanary(THRESHOLD);
        canary = observer.canaryAddress();
        IndependentDerivation.Point memory expected = IndependentDerivation.derive(observer.seedPhrase());
        assertEq(observer.seedHash(), expected.seedHash);
        assertEq(observer.pubKeyX(), expected.x);
        assertEq(observer.pubKeyY(), expected.y);
        assertEq(observer.counter(), expected.counter);
        assertEq(canary, expected.canary);
        assertEq(canary.balance, 0);
        assertEq(observer.highWaterMark(), 0);
        originalConfiguration = CanaryTestUtils.configurationHash(observer);
        originalCodeHash = address(observer).codehash;
        handler = new QuantumCanaryHandler(observer);

        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = handler.donate.selector;
        selectors[1] = handler.simulateBalance.selector;
        selectors[2] = handler.poke.selector;
        selectors[3] = handler.readGetter.selector;
        selectors[4] = handler.rejectedValueCall.selector;
        selectors[5] = handler.rejectedShortCall.selector;
        selectors[6] = handler.forceObserverCredit.selector;
        selectors[7] = handler.advanceClock.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// forge-config: default.invariant.runs = 256
    /// forge-config: default.invariant.depth = 96
    /// forge-config: default.invariant.fail-on-revert = true
    function invariant_ObservationsDetermineTheMarkLiveViewAndFirstTrip() public view {
        QuantumCanaryHandler.Observation[] memory history = handler.history();
        uint256 maximum;
        uint256 firstTime;
        uint256 firstBlock;
        uint256 markEvents;
        bool foundTrip;
        // Reconstruct the specification from external input history, never from
        // highWaterMark(), trippedAt() or the implementation's private flag.
        for (uint256 i; i < history.length; ++i) {
            QuantumCanaryHandler.Observation memory observation = history[i];
            if (observation.balance > maximum) {
                maximum = observation.balance;
                ++markEvents;
            }
            if (!foundTrip && maximum >= THRESHOLD && observation.balance < THRESHOLD) {
                foundTrip = true;
                firstTime = observation.timestamp;
                firstBlock = observation.blockNumber;
            }
        }
        assertEq(observer.highWaterMark(), maximum);
        assertEq(observer.isTripped(), maximum >= THRESHOLD && canary.balance < THRESHOLD);
        assertEq(observer.trippedAt(), firstTime);
        assertEq(observer.trippedBlock(), firstBlock);
        assertEq(handler.emittedTripCount(), foundTrip ? 1 : 0, "only the first observed theft emits");
        assertEq(handler.emittedMarkCount(), markEvents);
        assertEq(handler.lastEmittedMark(), maximum);
    }

    /// forge-config: default.invariant.runs = 256
    /// forge-config: default.invariant.depth = 96
    /// forge-config: default.invariant.fail-on-revert = true
    function invariant_ObserverCallsCannotMoveEitherBalance() public view {
        assertGe(handler.totalFunded(), handler.totalSimulatedTheft());
        assertEq(canary.balance, handler.totalFunded() - handler.totalSimulatedTheft());
        assertEq(address(observer).balance, handler.forcedObserverCredits());
        assertEq(address(handler).balance, 0, "the handler must spend donations or recover rejected value");
    }

    /// forge-config: default.invariant.runs = 256
    /// forge-config: default.invariant.depth = 96
    /// forge-config: default.invariant.fail-on-revert = true
    function invariant_ConfigurationAndRuntimeAreImmutable() public view {
        assertEq(CanaryTestUtils.configurationHash(observer), originalConfiguration);
        assertEq(address(observer).codehash, originalCodeHash);
        assertEq(canary.code.length, 0);
    }

    function test_HandlerExercisesTripAtZeroRefillAndLaterTheft() public {
        address caller = makeAddr("independent permissionless observer");
        handler.donate(2 ether);
        handler.poke(caller);
        handler.simulateBalance(1, 0); // One wei below the threshold.
        handler.poke(caller); // First trip at timestamp and block zero.
        _checkAllInvariants();
        assertEq(handler.emittedTripCount(), 1);

        handler.advanceClock(123, 12);
        handler.donate(2 ether);
        handler.poke(caller);
        handler.forceObserverCredit(3 ether);
        handler.rejectedValueCall(12, 1 ether); // poke() with value.
        handler.rejectedShortCall(hex"010203", 3);
        handler.simulateBalance(0, 0); // Complete theft after the refill.
        handler.readGetter(11); // A view must see the trip before another poke.
        handler.poke(caller);
        _checkAllInvariants();
        assertEq(observer.trippedAt(), 0);
        assertEq(observer.trippedBlock(), 0);
        assertEq(handler.emittedTripCount(), 1);
    }

    function _checkAllInvariants() private view {
        invariant_ObservationsDetermineTheMarkLiveViewAndFirstTrip();
        invariant_ObserverCallsCannotMoveEitherBalance();
        invariant_ConfigurationAndRuntimeAreImmutable();
    }
}
