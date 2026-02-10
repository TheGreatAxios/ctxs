// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RockPaperScissors is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Move { None, Rock, Paper, Scissors }
    enum GameState { Created, Committed, Revealed, Finished, Expired }

    struct Game {
        address player1;
        address player2;
        bytes32 commitment1;
        bytes32 commitment2;
        Move move1;
        Move move2;
        uint256 wagerAmount;
        address wagerToken;
        uint256 commitDeadline;
        uint256 revealDeadline;
        GameState state;
        address winner;
        bool player1Revealed;
        bool player2Revealed;
    }

    uint256 public constant COMMIT_TIMEOUT = 5 minutes;
    uint256 public constant REVEAL_TIMEOUT = 5 minutes;
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1%
    uint256 public constant BPS_DENOMINATOR = 10000;

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;
    address public feeRecipient;

    event GameCreated(
        uint256 indexed gameId,
        address indexed player1,
        uint256 wagerAmount,
        address wagerToken
    );
    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player2
    );
    event MoveCommitted(
        uint256 indexed gameId,
        address indexed player,
        bytes32 commitment
    );
    event MoveRevealed(
        uint256 indexed gameId,
        address indexed player,
        Move move
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

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    function createGame(
        bytes32 _commitment,
        uint256 _wagerAmount,
        address _wagerToken
    ) external payable nonReentrant returns (uint256 gameId) {
        require(_commitment != bytes32(0), "Invalid commitment");
        require(_wagerAmount == 0 || _wagerToken != address(0), "Invalid wager config");

        if (_wagerToken == address(0)) {
            require(msg.value == _wagerAmount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20 wager");
            IERC20(_wagerToken).safeTransferFrom(msg.sender, address(this), _wagerAmount);
        }

        gameId = nextGameId++;

        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            commitment1: _commitment,
            commitment2: bytes32(0),
            move1: Move.None,
            move2: Move.None,
            wagerAmount: _wagerAmount,
            wagerToken: _wagerToken,
            commitDeadline: block.timestamp + COMMIT_TIMEOUT,
            revealDeadline: 0,
            state: GameState.Created,
            winner: address(0),
            player1Revealed: false,
            player2Revealed: false
        });

        emit GameCreated(gameId, msg.sender, _wagerAmount, _wagerToken);
        emit MoveCommitted(gameId, msg.sender, _commitment);
    }

    function joinGame(
        uint256 _gameId,
        bytes32 _commitment
    ) external payable nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.Created, "Game not joinable");
        require(game.player1 != msg.sender, "Cannot play yourself");
        require(_commitment != bytes32(0), "Invalid commitment");
        require(block.timestamp < game.commitDeadline, "Commit deadline passed");

        if (game.wagerToken == address(0)) {
            require(msg.value == game.wagerAmount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH for ERC20 wager");
            IERC20(game.wagerToken).safeTransferFrom(msg.sender, address(this), game.wagerAmount);
        }

        game.player2 = msg.sender;
        game.commitment2 = _commitment;
        game.state = GameState.Committed;
        game.revealDeadline = block.timestamp + REVEAL_TIMEOUT;

        emit PlayerJoined(_gameId, msg.sender);
        emit MoveCommitted(_gameId, msg.sender, _commitment);
    }

    function revealMove(
        uint256 _gameId,
        Move _move,
        uint256 _nonce
    ) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.Committed || game.state == GameState.Revealed, "Invalid state");
        require(block.timestamp < game.revealDeadline, "Reveal deadline passed");
        require(_move != Move.None && uint256(_move) <= 3, "Invalid move");

        bytes32 commitment = keccak256(abi.encodePacked(_move, _nonce));

        if (msg.sender == game.player1) {
            require(!game.player1Revealed, "Already revealed");
            require(commitment == game.commitment1, "Invalid reveal");
            game.move1 = _move;
            game.player1Revealed = true;
        } else if (msg.sender == game.player2) {
            require(!game.player2Revealed, "Already revealed");
            require(commitment == game.commitment2, "Invalid reveal");
            game.move2 = _move;
            game.player2Revealed = true;
        } else {
            revert("Not a player");
        }

        if (game.state == GameState.Committed) {
            game.state = GameState.Revealed;
        }

        emit MoveRevealed(_gameId, msg.sender, _move);

        if (game.player1Revealed && game.player2Revealed) {
            _finishGame(_gameId);
        }
    }

    function claimTimeout(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.state == GameState.Created || game.state == GameState.Committed || game.state == GameState.Revealed, "Invalid state");

        if (game.state == GameState.Created) {
            require(block.timestamp >= game.commitDeadline, "Commit deadline not passed");
            game.state = GameState.Expired;
            _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
            emit GameExpired(_gameId, game.player1, game.wagerAmount);
        } else {
            require(block.timestamp >= game.revealDeadline, "Reveal deadline not passed");
            
            address winner;
            if (game.player1Revealed && !game.player2Revealed) {
                winner = game.player1;
            } else if (!game.player1Revealed && game.player2Revealed) {
                winner = game.player2;
            } else {
                game.state = GameState.Expired;
                _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
                _refundPlayer(game.player2, game.wagerAmount, game.wagerToken);
                emit GameExpired(_gameId, address(0), game.wagerAmount * 2);
                return;
            }

            game.winner = winner;
            game.state = GameState.Finished;
            uint256 totalPot = game.wagerAmount * 2;
            uint256 fee = (totalPot * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
            uint256 payout = totalPot - fee;

            _transferPayout(winner, payout, game.wagerToken);
            if (fee > 0) {
                _transferPayout(feeRecipient, fee, game.wagerToken);
            }

            emit GameFinished(_gameId, winner, payout);
        }
    }

    function _finishGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        game.state = GameState.Finished;

        address winner = _determineWinner(game.move1, game.move2);
        game.winner = winner;

        uint256 totalPot = game.wagerAmount * 2;

        if (winner == address(0)) {
            _refundPlayer(game.player1, game.wagerAmount, game.wagerToken);
            _refundPlayer(game.player2, game.wagerAmount, game.wagerToken);
            emit GameFinished(_gameId, address(0), 0);
        } else {
            uint256 fee = (totalPot * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
            uint256 payout = totalPot - fee;

            _transferPayout(winner, payout, game.wagerToken);
            if (fee > 0) {
                _transferPayout(feeRecipient, fee, game.wagerToken);
            }

            emit GameFinished(_gameId, winner, payout);
        }
    }

    function _determineWinner(Move _move1, Move _move2) internal pure returns (address) {
        if (_move1 == _move2) return address(0);
        if (
            (_move1 == Move.Rock && _move2 == Move.Scissors) ||
            (_move1 == Move.Paper && _move2 == Move.Rock) ||
            (_move1 == Move.Scissors && _move2 == Move.Paper)
        ) {
            return address(1); // Player 1 wins marker
        }
        return address(2); // Player 2 wins marker
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

    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function generateCommitment(Move _move, uint256 _nonce) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_move, _nonce));
    }
}