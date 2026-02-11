// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "./encryption/Precompiled.sol";

contract RockPaperScissors is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Move { None, Rock, Paper, Scissors }
    enum GameState { Created, Joined, Finished, Expired }

    struct Game {
        uint256 id;
        address player1;
        address player2;
        bytes encryptedMove1;
        bytes encryptedMove2;
        uint256 wagerAmount;
        address wagerToken;
        GameState state;
        bool resolved;
        address winner;
    }

    uint256 public constant COMMIT_TIMEOUT = 5 minutes;
    uint256 public constant CTX_GAS_COST = 0.006 ether;

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public userGasBalance;
    uint256 public nextGameId;

    address public queuePlayer;
    bytes public queueEncryptedMove;

    event GameCreated(
        uint256 indexed gameId,
        address indexed player1,
        uint256 wagerAmount,
        address wagerToken
    );
    event GameJoined(
        uint256 indexed gameId,
        address indexed player1,
        address indexed player2
    );
    event GameFinished(
        uint256 indexed gameId,
        address winner,
        uint256 payout
    );
    event GameExpired(
        uint256 indexed gameId,
        address recipient,
        uint256 refund
    );
    event GasDeposited(address indexed user, uint256 amount);
    event GasWithdrawn(address indexed user, uint256 amount);

    constructor() {}

    // ============ Gas Management ============

    function depositGas() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }

    function withdrawGas(uint256 amount) external nonReentrant {
        if (userGasBalance[msg.sender] < amount) revert("Insufficient gas balance");
        userGasBalance[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert("Transfer failed");
        emit GasWithdrawn(msg.sender, amount);
    }

    // ============ Game Logic ============

    function createGame(
        bytes calldata _encryptedMove,
        uint256 _wagerAmount,
        address _wagerToken
    ) external payable nonReentrant returns (uint256 gameId) {
        require(_encryptedMove.length > 0, "Invalid encrypted move");
        require(_wagerAmount == 0 || _wagerToken != address(0), "Invalid wager config");

        if (_wagerToken == address(0)) {
            require(msg.value == _wagerAmount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20 wager");
            IERC20(_wagerToken).safeTransferFrom(msg.sender, address(this), _wagerAmount);
        }

        if (queuePlayer == address(0)) {
            queuePlayer = msg.sender;
            queueEncryptedMove = _encryptedMove;
            gameId = nextGameId;
            emit GameCreated(gameId, msg.sender, _wagerAmount, _wagerToken);
        } else if (queuePlayer != msg.sender) {
            gameId = nextGameId++;

            if (_wagerToken == address(0)) {
                require(msg.value == _wagerAmount, "ETH amount mismatch");
            } else {
                IERC20(_wagerToken).safeTransferFrom(msg.sender, address(this), _wagerAmount);
            }

            games[gameId] = Game({
                id: gameId,
                player1: queuePlayer,
                player2: msg.sender,
                encryptedMove1: queueEncryptedMove,
                encryptedMove2: _encryptedMove,
                wagerAmount: _wagerAmount,
                wagerToken: _wagerToken,
                state: GameState.Joined,
                resolved: false,
                winner: address(0)
            });

            emit GameJoined(gameId, queuePlayer, msg.sender);

            delete queuePlayer;
            delete queueEncryptedMove;

            _submitCtx(gameId);
        } else {
            revert("Cannot play against yourself");
        }
    }

    function leaveQueue() external {
        if (queuePlayer != msg.sender) revert("Not in queue");
        delete queuePlayer;
        delete queueEncryptedMove;
    }

    function _submitCtx(uint256 _gameId) internal {
        if (userGasBalance[games[_gameId].player1] < CTX_GAS_COST) revert("Insufficient gas balance");

        Game storage game = games[_gameId];

        bytes[] memory encryptedArgs = new bytes[](2);
        encryptedArgs[0] = game.encryptedMove1;
        encryptedArgs[1] = game.encryptedMove2;

        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(_gameId);

        uint256 gasLimit = 300_000;

        address payable ctxSender = Precompiled.submitCTX(
            address(0x1B),
            gasLimit,
            abi.encode(encryptedArgs),
            abi.encode(plaintextArgs)
        );

        userGasBalance[game.player1] -= CTX_GAS_COST;
        (bool sent, ) = ctxSender.call{value: CTX_GAS_COST}("");
        if (!sent) {
            userGasBalance[game.player1] += CTX_GAS_COST;
            revert("CTX funding failed");
        }
    }

    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        require(decryptedArgs.length == 2, "Invalid decrypted args");
        require(plainArgs.length == 1, "Invalid plain args");

        uint256 gameId = abi.decode(plainArgs[0], (uint256));
        Game storage game = games[gameId];

        if (game.id != gameId || game.resolved) revert("Game not found");

        uint8 move1Value = uint8(uint256(bytes32(decryptedArgs[0])));
        uint8 move2Value = uint8(uint256(bytes32(decryptedArgs[1])));

        require(move1Value >= 1 && move1Value <= 3, "Invalid move 1");
        require(move2Value >= 1 && move2Value <= 3, "Invalid move 2");

        Move move1 = Move(move1Value);
        Move move2 = Move(move2Value);

        game.winner = _determineWinner(move1, move2);
        game.resolved = true;
        game.state = GameState.Finished;

        uint256 totalPot = game.wagerAmount * 2;

        if (game.winner == address(1)) {
            _transferPayout(game.player1, totalPot, game.wagerToken);
            emit GameFinished(gameId, game.player1, totalPot);
        } else if (game.winner == address(2)) {
            _transferPayout(game.player2, totalPot, game.wagerToken);
            emit GameFinished(gameId, game.player2, totalPot);
        } else {
            _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
            _refundPlayer(game.player2, game.wagerAmount, game.wagerToken);
            emit GameFinished(gameId, address(0), 0);
        }

        uint256 remainingGas = address(this).balance;
        if (remainingGas > 0 && userGasBalance[game.player1] > 0) {
            uint256 refund = remainingGas > userGasBalance[game.player1] ? remainingGas : userGasBalance[game.player1];
            (bool sent, ) = payable(game.player1).call{value: refund}("");
            if (sent) {
                userGasBalance[game.player1] = 0;
            }
        }
    }

    function _determineWinner(Move _move1, Move _move2) internal pure returns (address) {
        if (_move1 == _move2) return address(0);
        if (
            (_move1 == Move.Rock && _move2 == Move.Scissors) ||
            (_move1 == Move.Paper && _move2 == Move.Rock) ||
            (_move1 == Move.Scissors && _move2 == Move.Paper)
        ) {
            return address(1);
        }
        return address(2);
    }

    function _transferPayout(address _to, uint256 _amount, address _token) internal {
        if (_token == address(0)) {
            payable(_to).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    function _refundPlayer(address _player, uint256 _amount, address _token) internal {
        if (_token == address(0)) {
            payable(_player).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_player, _amount);
        }
    }

    // ============ View Functions ============

    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getCurrentQueue() external view returns (address player, bytes memory encryptedMove) {
        return (queuePlayer, queueEncryptedMove);
    }

    function isPlayerInQueue(address _player) external view returns (bool) {
        return queuePlayer == _player;
    }

    // ============ Fallback ============

    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
