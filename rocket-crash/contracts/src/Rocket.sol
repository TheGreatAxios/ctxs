// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IBITE {
    function submitCTX(uint256 gasLimit, bytes calldata data) external returns (address);
}

interface IRNG {
    function getRandomNumber() external view returns (uint256);
}

contract RocketGame {
    address public owner;
    mapping(address => bool) public isHouseOperator;

    IBITE public constant submitCTX = IBITE(address(0x1b));
    IRNG public constant rng = IRNG(address(0x18));

    uint256 public constant BETTING_DURATION = 15 seconds;
    uint256 public constant MAX_MULTIPLIER = 10000;
    uint256 public constant MULTIPLIER_PRECISION = 100;
    uint256 public constant MULTIPLIER_PER_BLOCK = 50;
    uint256 public constant CHECK_INTERVAL = 2 seconds;

    struct Passenger {
        address player;
        uint256 betAmount;
        uint256 ejectMultiplier;
        bool hasEjected;
    }

    struct Flight {
        uint256 launchTime;
        uint256 launchBlock;
        uint256 totalPot;
        uint256 targetHash;
        uint256 salt;
        uint256 crashPoint;
        Passenger[] passengers;
        bool hasCommitment;
        bool saltRevealed;
        bool isCrashed;
        bool hasPassengers;
        bool isFlying;
        uint256 lastCheckTime;
        mapping(address => uint256) passengerIndex;
    }

    mapping(uint256 => Flight) public flights;
    uint256 public currentFlight;
    mapping(address => uint256) public pendingWithdrawals;

    event HouseCommitted(uint256 indexed flightNumber, uint256 targetHash);
    event SaltRevealed(uint256 indexed flightNumber, uint256 salt);
    event FlightLaunched(uint256 indexed flightNumber);
    event RocketChecked(uint256 indexed flightNumber, uint256 rngValue, uint256 checkValue, bool shouldCrash);
    event FlightCrashed(uint256 indexed flightNumber, uint256 crashPoint, uint256 finalMultiplier);
    event PassengerBoarded(uint256 indexed flightNumber, address indexed player, uint256 bet, uint256 ejectMultiplier);
    event PassengerEjected(uint256 indexed flightNumber, address indexed player, uint256 ejectMultiplier, uint256 payout);
    event PassengerJumpedOff(uint256 indexed flightNumber, address indexed player, uint256 payout);
    event PassengerBurned(uint256 indexed flightNumber, address indexed player);
    event Withdrawal(address indexed player, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyHouse() {
        require(isHouseOperator[msg.sender], "Not house operator");
        _;
    }

    modifier validEjectMultiplier(uint256 multiplier) {
        require(multiplier > MULTIPLIER_PRECISION, "Eject must be > 1.00x");
        require(multiplier <= MAX_MULTIPLIER, "Eject too high");
        _;
    }

    constructor() {
        owner = msg.sender;
        isHouseOperator[msg.sender] = true;
        currentFlight = 1;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ============ House Functions ============

    function commitCrashPoint(uint256 flightNum, uint256 targetHash) external onlyHouse {
        require(!flights[flightNum].hasCommitment, "Already committed");
        flights[flightNum].targetHash = targetHash;
        flights[flightNum].hasCommitment = true;
        emit HouseCommitted(flightNum, targetHash);
    }

    function revealSalt(uint256 flightNum, uint256 salt) external onlyHouse {
        Flight storage flight = flights[flightNum];
        require(flight.hasCommitment, "Not committed");
        require(!flight.saltRevealed, "Already revealed");
        require(block.timestamp >= flight.launchTime, "Still boarding");
        flight.salt = salt;
        flight.saltRevealed = true;
        flight.isFlying = true;
        flight.launchBlock = block.number;
        emit SaltRevealed(flightNum, salt);
        emit FlightLaunched(flightNum);
    }

    function addHouseOperator(address operator) external onlyOwner {
        isHouseOperator[operator] = true;
    }

    function removeHouseOperator(address operator) external onlyOwner {
        isHouseOperator[operator] = false;
    }

    // ============ Player Functions ============

    function boardRocket(uint256 ejectMultiplier) external payable validEjectMultiplier(ejectMultiplier) {
        require(msg.value > 0, "Must bet something");
        Flight storage flight = flights[currentFlight];
        require(flight.hasCommitment, "Crash point not committed");
        require(!flight.isCrashed, "Flight crashed");
        if (!flight.hasPassengers) {
            flight.launchTime = block.timestamp + BETTING_DURATION;
            flight.hasPassengers = true;
        }
        require(block.timestamp < flight.launchTime, "Betting closed");
        require(flight.passengerIndex[msg.sender] == 0, "Already boarded");
        flight.passengers.push(Passenger({
            player: msg.sender,
            betAmount: msg.value,
            ejectMultiplier: ejectMultiplier,
            hasEjected: false
        }));
        flight.passengerIndex[msg.sender] = flight.passengers.length;
        flight.totalPot += msg.value;
        emit PassengerBoarded(currentFlight, msg.sender, msg.value, ejectMultiplier);
    }

    function jumpOff(uint256 flightNum) external {
        Flight storage flight = flights[flightNum];
        require(flight.isFlying, "Not flying");
        require(!flight.isCrashed, "Already crashed");
        uint256 passengerIdx = flight.passengerIndex[msg.sender];
        require(passengerIdx > 0, "Not on board");
        Passenger storage passenger = flight.passengers[passengerIdx - 1];
        require(!passenger.hasEjected, "Already ejected");
        uint256 payout = (passenger.betAmount * passenger.ejectMultiplier) / MULTIPLIER_PRECISION;
        pendingWithdrawals[msg.sender] += payout;
        passenger.hasEjected = true;
        emit PassengerJumpedOff(flightNum, msg.sender, payout);
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    // ============ Game Logic ============

    function checkRocket(uint256 flightNum) external {
        Flight storage flight = flights[flightNum];
        require(flight.hasCommitment, "Not committed");
        require(flight.saltRevealed, "Salt not revealed");
        require(flight.isFlying, "Not flying");
        require(!flight.isCrashed, "Already crashed");
        require(block.timestamp >= flight.lastCheckTime + CHECK_INTERVAL, "Check too soon");
        flight.lastCheckTime = block.timestamp;

        uint256 blocksElapsed = block.number - flight.launchBlock;
        uint256 currentMult = MULTIPLIER_PRECISION + (blocksElapsed * MULTIPLIER_PER_BLOCK);

        uint256 rngValue = rng.getRandomNumber();
        uint256 checkValue = (rngValue % 100) + flight.salt;
        bool shouldCrash = (checkValue == flight.targetHash);

        emit RocketChecked(flightNum, rngValue, checkValue, shouldCrash);

        if (shouldCrash) {
            flight.crashPoint = currentMult;
            flight.isCrashed = true;
            bytes[] memory encryptedArgs = new bytes[](1);
            encryptedArgs[0] = abi.encode(flightNum);
            bytes[] memory plaintextArgs = new bytes[](1);
            plaintextArgs[0] = abi.encode(flight.crashPoint);
            submitCTX.submitCTX(300000, abi.encode(encryptedArgs, plaintextArgs));
            emit FlightCrashed(flightNum, flight.crashPoint, currentMult);
            _processFlight(flightNum);
        }
    }

    function onDecrypt(bytes[] calldata decryptedArguments, bytes[] calldata) external {
        require(msg.sender == address(submitCTX), "Only BITE");
        uint256 flightNum = abi.decode(decryptedArguments[0], (uint256));
        _processFlight(flightNum);
    }

    // ============ View Functions ============

    function getFlightPassengers(uint256 flightNum) external view returns (Passenger[] memory) {
        return flights[flightNum].passengers;
    }

    function getFlightState(uint256 flightNum) external view returns (
        bool hasCommitment,
        bool saltRevealed,
        bool isFlying,
        bool isCrashed,
        bool hasPassengers
    ) {
        Flight storage flight = flights[flightNum];
        return (flight.hasCommitment, flight.saltRevealed, flight.isFlying, flight.isCrashed, flight.hasPassengers);
    }

    function getFlightInfo(uint256 flightNum) external view returns (
        uint256 launchTime,
        uint256 secondsRemaining,
        uint256 totalPot,
        uint256 passengerCount,
        bool isBettingOpen
    ) {
        Flight storage flight = flights[flightNum];
        bool bettingOpen = flight.hasPassengers && block.timestamp < flight.launchTime;
        return (
            flight.launchTime,
            bettingOpen ? flight.launchTime - block.timestamp : 0,
            flight.totalPot,
            flight.passengers.length,
            bettingOpen
        );
    }

    function getFlightMultiplier(uint256 flightNum) external view returns (
        uint256 currentMultiplier,
        uint256 crashPoint
    ) {
        Flight storage flight = flights[flightNum];
        uint256 mult = MULTIPLIER_PRECISION;
        if (flight.isFlying) {
            mult = MULTIPLIER_PRECISION + ((block.number - flight.launchBlock) * MULTIPLIER_PER_BLOCK);
        }
        return (mult, flight.crashPoint);
    }

    // ============ Internal ============

    function _processFlight(uint256 flightNum) internal {
        Flight storage flight = flights[flightNum];
        uint256 crashPt = flight.crashPoint;
        for (uint256 i = 0; i < flight.passengers.length; i++) {
            Passenger storage passenger = flight.passengers[i];
            if (!passenger.hasEjected) {
                if (passenger.ejectMultiplier < crashPt) {
                    uint256 payout = (passenger.betAmount * passenger.ejectMultiplier) / MULTIPLIER_PRECISION;
                    pendingWithdrawals[passenger.player] += payout;
                    passenger.hasEjected = true;
                    emit PassengerEjected(flightNum, passenger.player, passenger.ejectMultiplier, payout);
                } else {
                    emit PassengerBurned(flightNum, passenger.player);
                }
            }
        }
    }

    receive() external payable {}
}
