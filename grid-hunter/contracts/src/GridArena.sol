pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "./encryption/Precompiled.sol";
import "./MockERC20.sol";

/// @notice Grid Hunter - Blind battleship on a 4x4 grid
/// @dev Hider picks one square, hunter picks two; encrypted reveal via CTX
contract GridArena is ReentrancyGuard {

    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InsufficientGasBalance();
    error InvalidGameState();
    error Unauthorized();
    error TransferFailed();
    error GameNotFound();
    error InvalidGridPosition();

    // ═════════════════════════════════════════════════════════════════════════
    // Structs
    // ═════════════════════════════════════════════════════════════════════════
    struct Game {
        uint256 id;
        address hider;
        address hunter;
        bytes encryptedLoc;
        bytes encryptedShots;
        bool resolved;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    MockERC20 public immutable token;
    uint256 public constant STAKE = 10 * 10**18;
    uint256 public constant GRID_SIZE = 16;
    uint256 public constant CTX_GAS_COST = 0.006 ether;

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public userGasBalance;

    address public queueHider;
    bytes public queueEncryptedLoc;
    uint256 public gameIdCounter;

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event HidePlaced(uint256 indexed gameId, address indexed hider);
    event HuntStarted(uint256 indexed gameId, address indexed hider, address indexed hunter);
    event GridResult(
        uint256 indexed gameId,
        address indexed hider,
        address indexed hunter,
        uint256 hiddenLoc,
        uint256[2] shots,
        bool hunterWon
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
    /// @notice Hide position on the grid (0-15)
    function hide(bytes calldata _encryptedLoc) external nonReentrant {
        require(token.balanceOf(msg.sender) >= STAKE, "Insufficient tokens");
        require(token.allowance(msg.sender, address(this)) >= STAKE, "Insufficient allowance");

        if (queueHider == address(0)) {
            queueHider = msg.sender;
            queueEncryptedLoc = _encryptedLoc;
            emit HidePlaced(gameIdCounter, msg.sender);
        } else if (queueHider != msg.sender) {
            uint256 gameId = gameIdCounter++;

            games[gameId] = Game({
                id: gameId,
                hider: queueHider,
                hunter: msg.sender,
                encryptedLoc: queueEncryptedLoc,
                encryptedShots: _encryptedLoc,
                resolved: false
            });

            token.transferFrom(queueHider, address(this), STAKE);
            token.transferFrom(msg.sender, address(this), STAKE);

            emit HuntStarted(gameId, queueHider, msg.sender);

            delete queueHider;
            delete queueEncryptedLoc;
        } else {
            revert InvalidGameState();
        }
    }

    /// @notice Leave the queue
    function leaveQueue() external {
        if (queueHider != msg.sender) revert Unauthorized();
        delete queueHider;
        delete queueEncryptedLoc;
    }

    /// @notice Hunter takes shots at hidden positions
    function hunt(uint256 _gameId, bytes calldata _encryptedShots) external nonReentrant {
        Game storage game = games[_gameId];
        if (game.id != _gameId || game.resolved) revert GameNotFound();
        if (msg.sender != game.hunter) revert Unauthorized();

        game.encryptedShots = _encryptedShots;
        _submitCtx(_gameId);
    }

    /// @notice Submit CTX for game resolution
    function _submitCtx(uint256 _gameId) internal {
        if (userGasBalance[games[_gameId].hider] < CTX_GAS_COST) revert InsufficientGasBalance();

        Game storage game = games[_gameId];

        bytes[] memory encryptedArgs = new bytes[](2);
        encryptedArgs[0] = game.encryptedLoc;
        encryptedArgs[1] = game.encryptedShots;

        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(_gameId);

        uint256 gasLimit = 300_000;

        address payable ctxSender = Precompiled.submitCTX(address(0x1B), gasLimit, abi.encode(encryptedArgs), abi.encode(plaintextArgs));

        userGasBalance[game.hider] -= CTX_GAS_COST;
        (bool sent,) = ctxSender.call{value: CTX_GAS_COST}("");
        if (!sent) {
            userGasBalance[game.hider] += CTX_GAS_COST;
            revert TransferFailed();
        }
    }

    /// @notice BITE V2 callback - receives decrypted positions
    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        require(decryptedArgs.length == 2, "Invalid decrypted args");
        require(plainArgs.length == 1, "Invalid plain args");

        uint256 gameId = abi.decode(plainArgs[0], (uint256));
        Game storage game = games[gameId];

        if (game.id != gameId || game.resolved) revert GameNotFound();

        uint256 hiddenLoc = abi.decode(decryptedArgs[0], (uint256));

        uint256 shotsPacked = abi.decode(decryptedArgs[1], (uint256));
        uint256 shot1 = (shotsPacked >> 8) & 0xFF;
        uint256 shot2 = shotsPacked & 0xFF;

        bool hit = (shot1 == hiddenLoc || shot2 == hiddenLoc);

        address winner = hit ? game.hunter : game.hider;
        uint256 pot = STAKE * 2;

        token.transfer(winner, pot);

        uint256 remainingGas = address(this).balance;
        if (remainingGas > 0 && userGasBalance[game.hider] > 0) {
            uint256 refund = remainingGas > userGasBalance[game.hider] ? remainingGas : userGasBalance[game.hider];
            (bool sent,) = payable(game.hider).call{value: refund}("");
            if (sent) {
                userGasBalance[game.hider] = 0;
            }
        }

        game.resolved = true;

        uint256[2] memory shots = [shot1, shot2];
        emit GridResult(gameId, game.hider, game.hunter, hiddenLoc, shots, hit);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═════════════════════════════════════════════════════════════════════════
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getCurrentQueue() external view returns (address hider, bytes memory encryptedLoc) {
        return (queueHider, queueEncryptedLoc);
    }

    function isPlayerInQueue(address _player) external view returns (bool) {
        return queueHider == _player;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
