pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "./encryption/Precompiled.sol";
import "./MockERC20.sol";

/// @notice Liar's Yield - A bluffing game with encrypted secrets
/// @dev Maker claims about a secret number; challenger can call bluff
contract LiarsTable is ReentrancyGuard {
    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InsufficientGasBalance();
    error InvalidGameState();
    error Unauthorized();
    error TransferFailed();
    error ChallengeNotFound();
    error ChallengeExpired();

    // ═════════════════════════════════════════════════════════════════════════
    // Structs
    // ═════════════════════════════════════════════════════════════════════════
    struct Challenge {
        uint256 id;
        address maker;
        bytes encryptedSecret;
        uint256 wager;
        string claim;
        uint256 deadline;
        bool resolved;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    MockERC20 public immutable token;
    uint256 public constant TIMEOUT_BLOCKS = 10;
    uint256 public constant CTX_GAS_COST = 0.006 ether;

    mapping(uint256 => Challenge) public challenges;
    mapping(address => uint256) public userGasBalance;
    uint256 public challengeCounter;

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed maker,
        uint256 wager,
        string claim
    );
    event BluffCalled(uint256 indexed challengeId, address indexed challenger);
    event ChallengeResolved(
        uint256 indexed challengeId,
        address indexed winner,
        uint256 secret,
        bool claimMatched
    );
    event GasDeposited(address indexed user, uint256 amount);
    event GasWithdrawn(address indexed user, uint256 amount);

    // ═════════════════════════════════════════════════════════════════════════
    // Constructor
    // ═════════════════════════════════════════════════════════════════════════
    constructor(address _token) {
        token = MockERC20(_token);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Gas Management
    // ═════════════════════════════════════════════════════════════════════════
    function depositGas() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }

    function withdrawGas(uint256 amount) external nonReentrant {
        if (userGasBalance[msg.sender] < amount) revert InsufficientGasBalance();
        userGasBalance[msg.sender] -= amount;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit GasWithdrawn(msg.sender, amount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Game Logic
    // ═════════════════════════════════════════════════════════════════════════
    function commit(
        bytes calldata _encryptedSecret,
        uint256 _wager,
        string calldata _claim
    ) external nonReentrant {
        require(token.balanceOf(msg.sender) >= _wager, "Insufficient tokens");
        require(token.allowance(msg.sender, address(this)) >= _wager, "Insufficient allowance");

        uint256 challengeId = challengeCounter++;

        challenges[challengeId] = Challenge({
            id: challengeId,
            maker: msg.sender,
            encryptedSecret: _encryptedSecret,
            wager: _wager,
            claim: _claim,
            deadline: block.number + TIMEOUT_BLOCKS,
            resolved: false
        });

        token.transferFrom(msg.sender, address(this), _wager);

        emit ChallengeCreated(challengeId, msg.sender, _wager, _claim);
    }

    function callBluff(uint256 _challengeId) external nonReentrant {
        Challenge storage challenge = challenges[_challengeId];
        if (challenge.id != _challengeId || challenge.resolved) revert ChallengeNotFound();
        if (block.number >= challenge.deadline) revert ChallengeExpired();

        require(token.balanceOf(msg.sender) >= challenge.wager, "Insufficient tokens");
        require(token.allowance(msg.sender, address(this)) >= challenge.wager, "Insufficient allowance");
        require(msg.sender != challenge.maker, "Cannot call own bluff");

        token.transferFrom(msg.sender, address(this), challenge.wager);

        emit BluffCalled(_challengeId, msg.sender);

        _submitCtx(_challengeId);
    }

    function _submitCtx(uint256 _challengeId) internal {
        if (userGasBalance[challenges[_challengeId].maker] < CTX_GAS_COST) revert InsufficientGasBalance();

        Challenge storage challenge = challenges[_challengeId];

        bytes[] memory encryptedArgs = new bytes[](1);
        encryptedArgs[0] = challenge.encryptedSecret;

        bytes[] memory plaintextArgs = new bytes[](2);
        plaintextArgs[0] = abi.encode(_challengeId);
        plaintextArgs[1] = abi.encode(msg.sender);

        uint256 gasLimit = 300_000;

        address payable ctxSender = Precompiled.submitCTX(address(0x1B), gasLimit, abi.encode(encryptedArgs), abi.encode(plaintextArgs));

        userGasBalance[challenge.maker] -= CTX_GAS_COST;
        (bool sent,) = ctxSender.call{value: CTX_GAS_COST}("");
        if (!sent) {
            userGasBalance[challenge.maker] += CTX_GAS_COST;
            revert TransferFailed();
        }
    }

    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        require(decryptedArgs.length == 1, "Invalid decrypted args");
        require(plainArgs.length == 2, "Invalid plain args");

        uint256 challengeId = abi.decode(plainArgs[0], (uint256));
        address challenger = abi.decode(plainArgs[1], (address));

        Challenge storage challenge = challenges[challengeId];
        if (challenge.id != challengeId || challenge.resolved) revert ChallengeNotFound();

        uint256 secret = abi.decode(decryptedArgs[0], (uint256));

        bool claimMatched = _evaluateClaim(challenge.claim, secret);

        address winner = claimMatched ? challenge.maker : challenger;
        uint256 pot = challenge.wager * 2;

        token.transfer(winner, pot);

        uint256 remainingGas = address(this).balance;
        if (remainingGas > 0 && userGasBalance[challenge.maker] > 0) {
            uint256 refund = remainingGas > userGasBalance[challenge.maker] ? remainingGas : userGasBalance[challenge.maker];
            (bool sent,) = payable(challenge.maker).call{value: refund}("");
            if (sent) {
                userGasBalance[challenge.maker] = 0;
            }
        }

        challenge.resolved = true;

        emit ChallengeResolved(challengeId, winner, secret, claimMatched);
    }

    function _evaluateClaim(string memory _claim, uint256 _secret) internal pure returns (bool) {
        bytes memory claimBytes = bytes(_claim);

        if (claimBytes.length < 3) return false;

        if (claimBytes.length >= 3 && claimBytes[0] == "=" && claimBytes[1] == "=") {
            uint256 value = _parseNumber(claimBytes, 2);
            return _secret == value;
        }

        if (claimBytes.length >= 4 && claimBytes[0] == ">" && claimBytes[1] == "=") {
            uint256 value = _parseNumber(claimBytes, 3);
            return _secret >= value;
        }

        if (claimBytes.length >= 4 && claimBytes[0] == "<" && claimBytes[1] == "=") {
            uint256 value = _parseNumber(claimBytes, 3);
            return _secret <= value;
        }

        if (claimBytes[0] == ">") {
            uint256 value = _parseNumber(claimBytes, 1);
            return _secret > value;
        }

        if (claimBytes[0] == "<") {
            uint256 value = _parseNumber(claimBytes, 1);
            return _secret < value;
        }

        return false;
    }

    function _parseNumber(bytes memory _bytes, uint256 _offset) internal pure returns (uint256) {
        uint256 value = 0;
        for (uint256 i = _offset; i < _bytes.length; i++) {
            uint8 digit = uint8(_bytes[i]);
            if (digit >= 48 && digit <= 57) {
                value = value * 10 + (digit - 48);
            } else {
                break;
            }
        }
        return value;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═════════════════════════════════════════════════════════════════════════
    function getChallenge(uint256 _challengeId) external view returns (Challenge memory) {
        return challenges[_challengeId];
    }

    function getActiveChallengesCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < challengeCounter; i++) {
            if (!challenges[i].resolved && challenges[i].deadline >= block.number) {
                count++;
            }
        }
        return count;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
