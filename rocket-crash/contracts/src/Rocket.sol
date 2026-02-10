// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "skale-rng/SkaleRNG.sol";

interface IBITE {
    function submitCTX(uint256 gasLimit, bytes calldata data) external returns (address);
    function encryptTE(bytes calldata data) external view returns (bytes memory);
}

contract RocketGame {
    IBITE public constant BITE = IBITE(address(0x1b));
    ISkaleRNG public constant RNG = ISkaleRNG(address(0x18));
    
    uint256 public constant BETTING_DURATION = 15 seconds;
    uint256 public constant HOUSE_EDGE_BPS = 100; // 1% house edge
    uint256 public constant MAX_MULTIPLIER = 10000; // 100.00x
    uint256 public constant MULTIPLIER_PRECISION = 100; // 2 decimal places
    
    struct Passenger {
        address player;
        uint256 betAmount;
        uint256 ejectMultiplier;
        bool hasEjected;
        bool hasClaimed;
    }
    
    struct Flight {
        uint256 flightNumber;
        uint256 boardingStartTime;
        uint256 launchTime;
        uint256 totalPot;
        bytes encryptedCrashPoint;
        uint256 crashPoint;
        Passenger[] passengers;
        bool isResolved;
        bool hasPassengers;
        mapping(address => uint256) passengerIndex;
    }
    
    mapping(uint256 => Flight) public flights;
    uint256 public currentFlight;
    
    mapping(address => uint256) public pendingWithdrawals;
    
    event FlightScheduled(uint256 indexed flightNumber);
    event PassengerBoarded(uint256 indexed flightNumber, address indexed player, uint256 bet, uint256 ejectMultiplier);
    event FlightLaunched(uint256 indexed flightNumber);
    event CrashPointRevealed(uint256 indexed flightNumber, uint256 crashPoint);
    event PassengerEjected(uint256 indexed flightNumber, address indexed player, uint256 atMultiplier, uint256 payout);
    event PassengerBurned(uint256 indexed flightNumber, address indexed player);
    event Withdrawal(address indexed player, uint256 amount);
    event AutoLaunchTriggered(uint256 indexed flightNumber, uint256 launchTime);
    
    modifier validEjectMultiplier(uint256 multiplier) {
        require(multiplier > MULTIPLIER_PRECISION, "Eject must be > 1.00x");
        require(multiplier <= MAX_MULTIPLIER, "Eject too high");
        _;
    }
    
    constructor() {
        currentFlight = 1;
        _scheduleFlight(1);
    }
    
    function _scheduleFlight(uint256 flightNum) internal {
        Flight storage flight = flights[flightNum];
        flight.flightNumber = flightNum;
        
        // Generate and encrypt crash point for this flight
        bytes32 rngSeed = RNG.getRandomNumber();
        uint256 crashPoint = _calculateCrashPoint(rngSeed);
        flight.encryptedCrashPoint = BITE.encryptTE(abi.encode(crashPoint));
        
        emit FlightScheduled(flightNum);
    }
    
    function _calculateCrashPoint(bytes32 seed) internal pure returns (uint256) {
        uint256 r = uint256(seed);
        uint256 e = 10000 - HOUSE_EDGE_BPS;
        
        uint256 modResult = r % e;
        if (modResult == 0) modResult = 1;
        
        uint256 numerator = (99 * e * MULTIPLIER_PRECISION) / 100;
        uint256 denominator = e - modResult;
        
        uint256 crashMultiplier = numerator / denominator;
        
        if (crashMultiplier < 101) crashMultiplier = 101;
        
        return crashMultiplier;
    }
    
    function boardRocket(uint256 ejectMultiplier) external payable validEjectMultiplier(ejectMultiplier) {
        require(msg.value > 0, "Must bet something");
        
        Flight storage flight = flights[currentFlight];
        
        // Start the timer when first passenger boards
        if (!flight.hasPassengers) {
            flight.boardingStartTime = block.timestamp;
            flight.launchTime = block.timestamp + BETTING_DURATION;
            flight.hasPassengers = true;
        }
        
        // Check if boarding is still open
        require(block.timestamp < flight.launchTime, "Betting closed");
        
        // Check if player already boarded
        require(flight.passengerIndex[msg.sender] == 0, "Already boarded");
        
        flight.passengers.push(Passenger({
            player: msg.sender,
            betAmount: msg.value,
            ejectMultiplier: ejectMultiplier,
            hasEjected: false,
            hasClaimed: false
        }));
        
        flight.passengerIndex[msg.sender] = flight.passengers.length;
        flight.totalPot += msg.value;
        
        emit PassengerBoarded(currentFlight, msg.sender, msg.value, ejectMultiplier);
    }
    
    function launchFlight() external {
        Flight storage flight = flights[currentFlight];
        require(flight.hasPassengers, "No passengers");
        require(block.timestamp >= flight.launchTime, "Still boarding");
        require(flight.crashPoint == 0, "Already launched");
        
        _launch();
    }
    
    function _launch() internal {
        Flight storage flight = flights[currentFlight];
        
        bytes memory ctxData = abi.encode(currentFlight);
        BITE.submitCTX(100000, ctxData);
        
        emit FlightLaunched(currentFlight);
        emit AutoLaunchTriggered(currentFlight, block.timestamp);
        
        // Schedule next flight immediately
        currentFlight++;
        _scheduleFlight(currentFlight);
    }
    
    function onDecrypt(bytes[] calldata decryptedArguments, bytes[] calldata) external {
        require(msg.sender == address(BITE), "Only BITE");
        
        uint256 flightNum = abi.decode(decryptedArguments[0], (uint256));
        Flight storage flight = flights[flightNum];
        
        require(!flight.isResolved, "Already resolved");
        require(flight.crashPoint == 0, "Crash point already set");
        
        uint256 crashPoint = abi.decode(decryptedArguments[1], (uint256));
        flight.crashPoint = crashPoint;
        flight.isResolved = true;
        
        emit CrashPointRevealed(flightNum, crashPoint);
        
        _processFlight(flightNum);
    }
    
    function _processFlight(uint256 flightNum) internal {
        Flight storage flight = flights[flightNum];
        uint256 crashPoint = flight.crashPoint;
        
        for (uint256 i = 0; i < flight.passengers.length; i++) {
            Passenger storage passenger = flight.passengers[i];
            
            if (passenger.ejectMultiplier < crashPoint) {
                uint256 payout = (passenger.betAmount * passenger.ejectMultiplier) / MULTIPLIER_PRECISION;
                pendingWithdrawals[passenger.player] += payout;
                passenger.hasEjected = true;
                
                emit PassengerEjected(flightNum, passenger.player, passenger.ejectMultiplier, payout);
            } else {
                emit PassengerBurned(flightNum, passenger.player);
            }
        }
    }
    
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    function getFlightPassengers(uint256 flightNum) external view returns (Passenger[] memory) {
        return flights[flightNum].passengers;
    }
    
    function getCurrentFlightInfo() external view returns (
        uint256 flightNumber,
        uint256 boardingStartTime,
        uint256 launchTime,
        uint256 secondsRemaining,
        uint256 totalPot,
        uint256 passengerCount,
        bool isBettingOpen,
        bool hasPassengers
    ) {
        Flight storage flight = flights[currentFlight];
        uint256 timeRemaining = flight.hasPassengers && block.timestamp < flight.launchTime
            ? flight.launchTime - block.timestamp
            : 0;
        
        return (
            flight.flightNumber,
            flight.boardingStartTime,
            flight.launchTime,
            timeRemaining,
            flight.totalPot,
            flight.passengers.length,
            flight.hasPassengers && block.timestamp < flight.launchTime,
            flight.hasPassengers
        );
    }
    
    receive() external payable {}
    fallback() external payable {}
}