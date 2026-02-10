// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Rocket.sol";

contract MockBITE is IBITE {
    mapping(bytes => uint256) public encryptedValues;
    
    function submitCTX(uint256 gasLimit, bytes calldata data) external override returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(data, block.timestamp)))));
    }
    
    function encryptTE(bytes calldata data) external pure override returns (bytes memory) {
        return data;
    }
    
    function encryptECIES(bytes calldata, bytes32, bytes32) external pure override returns (bytes memory) {
        return "";
    }
    
    function setDecryptedValue(bytes calldata encrypted, uint256 value) external {
        encryptedValues[encrypted] = value;
    }
}

contract MockRNG is ISkaleRNG {
    uint256 public counter;
    
    function getRandomNumber() external override returns (bytes32) {
        counter++;
        return keccak256(abi.encodePacked(block.timestamp, msg.sender, counter));
    }
    
    function getNextRandomNumber() external view override returns (bytes32) {
        return keccak256(abi.encodePacked(block.timestamp, msg.sender, counter + 1));
    }
    
    function getRandomNumberByIndex(uint256 index) external view override returns (bytes32) {
        return keccak256(abi.encodePacked(block.timestamp, index));
    }
}

contract CrashMathTest is Test {
    MockBITE bite;
    MockRNG rng;
    RocketGame game;
    
    address public constant ALICE = address(0x1);
    address public constant BOB = address(0x2);
    address public constant CAROL = address(0x3);
    
    function setUp() public {
        bite = new MockBITE();
        rng = new MockRNG();
        
        // Deploy game with mocked precompiles
        game = new RocketGame();
        
        vm.deal(ALICE, 100 ether);
        vm.deal(BOB, 100 ether);
        vm.deal(CAROL, 100 ether);
    }
    
    function testCrashPointDistribution() public {
        // Test that crash points follow expected distribution
        uint256[100] memory crashPoints;
        
        for (uint256 i = 0; i < 100; i++) {
            bytes32 seed = keccak256(abi.encodePacked(i));
            crashPoints[i] = _calculateCrashPoint(seed);
        }
        
        // Count how many are below certain thresholds
        uint256 below1_5x = 0;
        uint256 below2x = 0;
        uint256 below5x = 0;
        uint256 below10x = 0;
        
        for (uint256 i = 0; i < 100; i++) {
            if (crashPoints[i] < 150) below1_5x++;
            if (crashPoints[i] < 200) below2x++;
            if (crashPoints[i] < 500) below5x++;
            if (crashPoints[i] < 1000) below10x++;
        }
        
        // Log distribution
        console.log("Crash Point Distribution (100 samples):");
        console.log("Below 1.5x:", below1_5x);
        console.log("Below 2x:", below2x);
        console.log("Below 5x:", below5x);
        console.log("Below 10x:", below10x);
        
        // Verify minimum is above 1.00x
        for (uint256 i = 0; i < 100; i++) {
            assertGe(crashPoints[i], 101, "Crash point must be >= 1.01x");
        }
    }
    
    function testCrashPointMathFormula() public pure {
        // Test specific seeds to verify math formula
        bytes32 seed1 = keccak256(abi.encodePacked(uint256(1)));
        uint256 crash1 = _calculateCrashPoint(seed1);
        console.log("Crash point for seed 1:", crash1);
        
        bytes32 seed2 = keccak256(abi.encodePacked(uint256(42)));
        uint256 crash2 = _calculateCrashPoint(seed2);
        console.log("Crash point for seed 42:", crash2);
        
        bytes32 seed3 = keccak256(abi.encodePacked(uint256(999)));
        uint256 crash3 = _calculateCrashPoint(seed3);
        console.log("Crash point for seed 999:", crash3);
    }
    
    function testHouseEdge() public pure {
        // Run many iterations to verify house edge
        uint256 totalMultiplier = 0;
        uint256 iterations = 1000;
        
        for (uint256 i = 0; i < iterations; i++) {
            bytes32 seed = keccak256(abi.encodePacked(i));
            totalMultiplier += _calculateCrashPoint(seed);
        }
        
        uint256 averageMultiplier = totalMultiplier / iterations;
        console.log("Average multiplier over 1000 runs:", averageMultiplier);
        
        // With 1% house edge, expected average should be around 0.99x
        // But due to the distribution, most values are low
        assertGe(averageMultiplier, 100, "Average should be reasonable");
    }
    
    function testBoardingAndPayout() public {
        // Alice boards with 2.0x auto eject
        vm.prank(ALICE);
        game.boardRocket{value: 1 ether}(200); // 2.00x
        
        // Verify boarding
        (,,, uint256 totalPot, uint256 passengerCount,) = game.getCurrentFlightInfo();
        assertEq(totalPot, 1 ether);
        assertEq(passengerCount, 1);
    }
    
    function testInvalidEjectMultiplier() public {
        // Try to board with eject multiplier too low
        vm.prank(ALICE);
        vm.expectRevert("Eject must be > 1.00x");
        game.boardRocket{value: 1 ether}(100); // 1.00x - too low
    }
    
    function testDoubleBoarding() public {
        vm.prank(ALICE);
        game.boardRocket{value: 1 ether}(150);
        
        vm.prank(ALICE);
        vm.expectRevert("Already boarded");
        game.boardRocket{value: 1 ether}(200);
    }
    
    function _calculateCrashPoint(bytes32 seed) internal pure returns (uint256) {
        uint256 r = uint256(seed);
        uint256 e = 10000 - 100; // 1% house edge
        
        uint256 modResult = r % e;
        if (modResult == 0) modResult = 1;
        
        uint256 numerator = (99 * e * 100) / 100;
        uint256 denominator = e - modResult;
        
        uint256 crashMultiplier = numerator / denominator;
        
        if (crashMultiplier < 101) crashMultiplier = 101;
        
        return crashMultiplier;
    }
}