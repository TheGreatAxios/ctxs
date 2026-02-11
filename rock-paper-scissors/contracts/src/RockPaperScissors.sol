// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./encryption/Precompiled.sol";

contract RockPaperScissors is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Move { None, Rock, Paper, Scissors }
    enum GameState { Created, Joined, Finished, Expired }

    struct Game {
        address player1;
        address player2;
        bytes encryptedMove1;
        bytes encryptedMove2;
        uint8 move1;
        uint8 move2;
        uint256 wagerAmount;
        address wagerToken;
        GameState state;
        uint256 joinDeadline;
        address winner;
    }

    // BITE V2 Precompile addresses
    address public constant SUBMIT_CTX = 0x000000000000000000000000000000000000001B;
    address public constant ENCRYPT_TE = 0x000000000000000000000000000000000000001c;

    uint256 public constant JOIN_TIMEOUT = 1 hours;
    uint256 public constant CTX_GAS_LIMIT = 300000;
    uint256 public constant CTX_GAS_PAYMENT = 0.06 ether; // 0.06 ETH for CTX gas

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;

    event GameCreated(uint256 indexed gameId, address indexed player, uint256 wagerAmount, address wagerToken);
    event GameJoined(uint256 indexed gameId, address indexed player2, bytes encryptedMove);
    event MovesDecrypted(uint256 indexed gameId, uint8 move1, uint8 move2);
    event GameFinished(uint256 indexed gameId, address winner);
    event GameExpired(uint256 indexed gameId);

    constructor() {}

    function createGame(bytes calldata _encryptedMove, uint256 _wagerAmount, address _wagerToken)
        external
        nonReentrant
        returns (uint256 gameId)
    {
        require(_encryptedMove.length > 0, "Invalid encrypted move");
        require(_wagerToken != address(0), "Must use ERC20 token");

        // Transfer wager tokens from player to contract
        IERC20(_wagerToken).safeTransferFrom(msg.sender, address(this), _wagerAmount);

        gameId = nextGameId++;
        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            encryptedMove1: _encryptedMove,
            encryptedMove2: "",
            move1: 0,
            move2: 0,
            wagerAmount: _wagerAmount,
            wagerToken: _wagerToken,
            state: GameState.Created,
            joinDeadline: block.timestamp + JOIN_TIMEOUT,
            winner: address(0)
        });

        emit GameCreated(gameId, msg.sender, _wagerAmount, _wagerToken);
    }

    function joinGame(uint256 _gameId, bytes calldata _encryptedMove)
        external
        payable
        nonReentrant
    {
        Game storage game = games[_gameId];
        require(game.player1 != address(0), "Game not found");
        require(game.player2 == address(0), "Game full");
        require(game.state == GameState.Created, "Invalid state");
        require(block.timestamp <= game.joinDeadline, "Expired");
        require(_encryptedMove.length > 0, "Invalid encrypted move");
        require(msg.value == CTX_GAS_PAYMENT, "Invalid CTX gas payment");

        // Transfer wager tokens from player to contract
        IERC20(game.wagerToken).safeTransferFrom(msg.sender, address(this), game.wagerAmount);

        game.player2 = msg.sender;
        game.encryptedMove2 = _encryptedMove;
        game.state = GameState.Joined;

        emit GameJoined(_gameId, msg.sender, _encryptedMove);

        // Submit CTX to decrypt both moves
        _submitDecryptCTX(_gameId);
    }

    function _submitDecryptCTX(uint256 _gameId) internal {
        Game storage game = games[_gameId];

        // Prepare encrypted args (both moves)
        bytes[] memory encryptedArgs = new bytes[](2);
        encryptedArgs[0] = game.encryptedMove1;
        encryptedArgs[1] = game.encryptedMove2;

        // Prepare plaintext args (game ID for callback)
        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(_gameId);

        // Get CTX sender address and transfer gas payment
        address payable ctxSender = Precompiled.submitCTX(
            SUBMIT_CTX,
            CTX_GAS_LIMIT,
            abi.encode(encryptedArgs),
            abi.encode(plaintextArgs)
        );

        // Transfer gas payment to CTX sender
        payable(ctxSender).transfer(CTX_GAS_PAYMENT);
    }

    function onDecrypt(bytes[] calldata decryptedArguments, bytes[] calldata plaintextArguments)
        external
        nonReentrant
    {
        // Must be called by CTX (self-call)
        require(msg.sender == address(this), "Not a CTX call");

        // Decode game ID from plaintext args
        uint256 gameId = abi.decode(plaintextArguments[0], (uint256));
        Game storage game = games[gameId];

        require(game.player1 != address(0), "Game not found");
        require(game.state == GameState.Joined, "Invalid state");

        // Decrypt moves from BITE
        game.move1 = uint8(bytes1(decryptedArguments[0]));
        game.move2 = uint8(bytes1(decryptedArguments[1]));

        require(game.move1 >= 1 && game.move1 <= 3, "Invalid move1");
        require(game.move2 >= 1 && game.move2 <= 3, "Invalid move2");

        emit MovesDecrypted(gameId, game.move1, game.move2);

        // Resolve game
        _resolveGame(gameId);
    }

    function _resolveGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];

        Move move1 = Move(game.move1);
        Move move2 = Move(game.move2);

        if (move1 == move2) {
            // Draw - refund both
            game.winner = address(0);
            _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
            _refundPlayer(game.player2, game.wagerAmount, game.wagerToken);
        } else if (
            (move1 == Move.Rock && move2 == Move.Scissors) ||
            (move1 == Move.Paper && move2 == Move.Rock) ||
            (move1 == Move.Scissors && move2 == Move.Paper)
        ) {
            // Player 1 wins
            game.winner = game.player1;
            _transferPayout(game.player1, game.wagerAmount * 2, game.wagerToken);
        } else {
            // Player 2 wins
            game.winner = game.player2;
            _transferPayout(game.player2, game.wagerAmount * 2, game.wagerToken);
        }

        game.state = GameState.Finished;
        emit GameFinished(_gameId, game.winner);
    }

    function claimTimeout(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.player1 != address(0), "Game not found");

        if (game.state == GameState.Created && block.timestamp > game.joinDeadline) {
            // No one joined, refund player1
            _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
            game.state = GameState.Expired;
            emit GameExpired(_gameId);
        }
    }

    function _transferPayout(address _to, uint256 _amount, address _token) internal {
        IERC20(_token).safeTransfer(_to, _amount);
    }

    function _refundPlayer(address _player, uint256 _amount, address _token) internal {
        IERC20(_token).safeTransfer(_player, _amount);
    }

    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    // Allow contract to receive ETH for CTX gas payments
    receive() external payable {}
    fallback() external payable {}
}
