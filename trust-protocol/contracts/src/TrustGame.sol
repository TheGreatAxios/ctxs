pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "./encryption/Precompiled.sol";
import "./MockERC20.sol";

/// @notice Trust Protocol - Prisoner's Dilemma with encrypted moves
/// @dev Moves are encrypted and revealed via BITE V2 conditional transactions
contract TrustGame is ReentrancyGuard {
    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InsufficientGasBalance();
    error InvalidGameState();
    error Unauthorized();
    error TransferFailed();
    error GameNotFound();

    // ═════════════════════════════════════════════════════════════════════════
    // Enums & Structs
    // ═════════════════════════════════════════════════════════════════════════
    enum Move { COOPERATE, DEFECT }

    struct Game {
        uint256 id;
        address playerA;
        address playerB;
        bytes encryptedMoveA;
        bytes encryptedMoveB;
        bool resolved;
        bool playerAJoined;
        bool playerBJoined;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    MockERC20 public immutable token;
    uint256 public constant BET_SIZE = 10 * 10**18;
    uint256 public constant CTX_GAS_COST = 0.006 ether;

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public userGasBalance;

    address public queuePlayer;
    bytes public queueEncryptedMove;
    uint256 public gameIdCounter;

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event GameJoined(address indexed player, uint256 indexed gameId);
    event GameStarted(uint256 indexed gameId, address indexed playerA, address indexed playerB);
    event GameResult(
        uint256 indexed gameId,
        address indexed playerA,
        address indexed playerB,
        Move moveA,
        Move moveB,
        uint256 payoutA,
        uint256 payoutB
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
    function joinGame(bytes calldata _encryptedMove) external nonReentrant {
        require(token.balanceOf(msg.sender) >= BET_SIZE, "Insufficient tokens");
        require(token.allowance(msg.sender, address(this)) >= BET_SIZE, "Insufficient allowance");

        if (queuePlayer == address(0)) {
            queuePlayer = msg.sender;
            queueEncryptedMove = _encryptedMove;
            emit GameJoined(msg.sender, gameIdCounter);
        } else if (queuePlayer != msg.sender) {
            uint256 gameId = gameIdCounter++;

            games[gameId] = Game({
                id: gameId,
                playerA: queuePlayer,
                playerB: msg.sender,
                encryptedMoveA: queueEncryptedMove,
                encryptedMoveB: _encryptedMove,
                resolved: false,
                playerAJoined: true,
                playerBJoined: true
            });

            token.transferFrom(queuePlayer, address(this), BET_SIZE);
            token.transferFrom(msg.sender, address(this), BET_SIZE);

            emit GameStarted(gameId, queuePlayer, msg.sender);

            delete queuePlayer;
            delete queueEncryptedMove;

            _submitCtx(gameId);
        } else {
            revert InvalidGameState();
        }
    }

    function leaveQueue() external {
        if (queuePlayer != msg.sender) revert Unauthorized();
        delete queuePlayer;
        delete queueEncryptedMove;
    }

    function _submitCtx(uint256 _gameId) internal {
        if (userGasBalance[games[_gameId].playerA] < CTX_GAS_COST) revert InsufficientGasBalance();

        Game storage game = games[_gameId];

        bytes[] memory encryptedArgs = new bytes[](2);
        encryptedArgs[0] = game.encryptedMoveA;
        encryptedArgs[1] = game.encryptedMoveB;

        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(_gameId);

        uint256 gasLimit = 300_000;

        address payable ctxSender = Precompiled.submitCTX(address(0x1B), gasLimit, abi.encode(encryptedArgs), abi.encode(plaintextArgs));

        userGasBalance[game.playerA] -= CTX_GAS_COST;
        (bool sent,) = ctxSender.call{value: CTX_GAS_COST}("");
        if (!sent) {
            userGasBalance[game.playerA] += CTX_GAS_COST;
            revert TransferFailed();
        }
    }

    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        require(decryptedArgs.length == 2, "Invalid decrypted args");
        require(plainArgs.length == 1, "Invalid plain args");

        uint256 gameId = abi.decode(plainArgs[0], (uint256));
        Game storage game = games[gameId];

        if (game.id != gameId || game.resolved) revert GameNotFound();

        uint8 moveAValue = uint8(uint256(bytes32(decryptedArgs[0])));
        uint8 moveBValue = uint8(uint256(bytes32(decryptedArgs[1])));
        Move moveA = Move(moveAValue);
        Move moveB = Move(moveBValue);

        (uint256 payoutA, uint256 payoutB) = _calculatePayouts(moveA, moveB);

        if (payoutA > 0) {
            token.transfer(game.playerA, payoutA);
        }
        if (payoutB > 0) {
            token.transfer(game.playerB, payoutB);
        }

        uint256 remainingGas = address(this).balance;
        if (remainingGas > 0 && userGasBalance[game.playerA] > 0) {
            uint256 refund = remainingGas > userGasBalance[game.playerA] ? remainingGas : userGasBalance[game.playerA];
            (bool sent,) = payable(game.playerA).call{value: refund}("");
            if (sent) {
                userGasBalance[game.playerA] = 0;
            }
        }

        game.resolved = true;

        emit GameResult(gameId, game.playerA, game.playerB, moveA, moveB, payoutA, payoutB);
    }

    function _calculatePayouts(Move _moveA, Move _moveB) internal pure returns (uint256, uint256) {
        if (_moveA == Move.COOPERATE && _moveB == Move.COOPERATE) {
            return (9 * 10**18, 9 * 10**18);
        } else if (_moveA == Move.DEFECT && _moveB == Move.DEFECT) {
            return (4 * 10**18, 4 * 10**18);
        } else if (_moveA == Move.COOPERATE && _moveB == Move.DEFECT) {
            return (0, 15 * 10**18);
        } else {
            return (15 * 10**18, 0);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═════════════════════════════════════════════════════════════════════════
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getCurrentQueue() external view returns (address player, bytes memory encryptedMove) {
        return (queuePlayer, queueEncryptedMove);
    }

    function isPlayerInQueue(address _player) external view returns (bool) {
        return queuePlayer == _player;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
