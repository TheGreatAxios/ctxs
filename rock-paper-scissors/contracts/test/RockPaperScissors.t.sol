// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/RockPaperScissors.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

contract RockPaperScissorsTest is Test {
    RockPaperScissors public game;
    MockERC20 public token;
    
    address public player1 = address(1);
    address public player2 = address(2);
    address public feeRecipient = address(3);
    
    uint256 constant WAGER = 1 ether;

    function setUp() public {
        game = new RockPaperScissors(feeRecipient);
        token = new MockERC20();
        
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        token.transfer(player1, 1000 * 10**18);
        token.transfer(player2, 1000 * 10**18);
    }

    function test_CreateGameWithETH() public {
        bytes32 commitment = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, uint256(123)));
        
        vm.prank(player1);
        uint256 gameId = game.createGame{value: WAGER}(commitment, WAGER, address(0));
        
        RockPaperScissors.Game memory g = game.getGame(gameId);
        assertEq(g.player1, player1);
        assertEq(g.wagerAmount, WAGER);
        assertEq(g.wagerToken, address(0));
        assertEq(uint(g.state), uint(RockPaperScissors.GameState.Created));
    }

    function test_CreateGameWithERC20() public {
        bytes32 commitment = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, uint256(123)));
        
        vm.startPrank(player1);
        token.approve(address(game), WAGER);
        uint256 gameId = game.createGame(commitment, WAGER, address(token));
        vm.stopPrank();
        
        RockPaperScissors.Game memory g = game.getGame(gameId);
        assertEq(g.wagerToken, address(token));
        assertEq(token.balanceOf(address(game)), WAGER);
    }

    function test_FullGameFlow() public {
        uint256 nonce1 = 123;
        uint256 nonce2 = 456;
        bytes32 commitment1 = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, nonce1));
        bytes32 commitment2 = keccak256(abi.encodePacked(RockPaperScissors.Move.Scissors, nonce2));
        
        vm.prank(player1);
        uint256 gameId = game.createGame{value: WAGER}(commitment1, WAGER, address(0));
        
        vm.prank(player2);
        game.joinGame{value: WAGER}(gameId, commitment2);
        
        vm.prank(player1);
        game.revealMove(gameId, RockPaperScissors.Move.Rock, nonce1);
        
        vm.prank(player2);
        game.revealMove(gameId, RockPaperScissors.Move.Scissors, nonce2);
        
        RockPaperScissors.Game memory g = game.getGame(gameId);
        assertEq(uint(g.state), uint(RockPaperScissors.GameState.Finished));
        assertEq(g.winner, address(1)); // Player 1 wins
    }

    function test_TimeoutCommit() public {
        bytes32 commitment = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, uint256(123)));
        
        vm.prank(player1);
        uint256 gameId = game.createGame{value: WAGER}(commitment, WAGER, address(0));
        
        vm.warp(block.timestamp + game.COMMIT_TIMEOUT() + 1);
        
        uint256 balanceBefore = player1.balance;
        game.claimTimeout(gameId);
        
        assertEq(player1.balance - balanceBefore, WAGER);
    }

    function test_TimeoutReveal() public {
        uint256 nonce1 = 123;
        uint256 nonce2 = 456;
        bytes32 commitment1 = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, nonce1));
        bytes32 commitment2 = keccak256(abi.encodePacked(RockPaperScissors.Move.Scissors, nonce2));
        
        vm.prank(player1);
        uint256 gameId = game.createGame{value: WAGER}(commitment1, WAGER, address(0));
        
        vm.prank(player2);
        game.joinGame{value: WAGER}(gameId, commitment2);
        
        vm.prank(player1);
        game.revealMove(gameId, RockPaperScissors.Move.Rock, nonce1);
        
        vm.warp(block.timestamp + game.REVEAL_TIMEOUT() + 1);
        
        uint256 balanceBefore = player1.balance;
        game.claimTimeout(gameId);
        
        assertGt(player1.balance - balanceBefore, WAGER * 2 * 99 / 100); // Minus fee
    }

    function test_Draw() public {
        uint256 nonce1 = 123;
        uint256 nonce2 = 456;
        bytes32 commitment1 = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, nonce1));
        bytes32 commitment2 = keccak256(abi.encodePacked(RockPaperScissors.Move.Rock, nonce2));
        
        vm.prank(player1);
        uint256 gameId = game.createGame{value: WAGER}(commitment1, WAGER, address(0));
        
        vm.prank(player2);
        game.joinGame{value: WAGER}(gameId, commitment2);
        
        vm.prank(player1);
        game.revealMove(gameId, RockPaperScissors.Move.Rock, nonce1);
        
        vm.prank(player2);
        game.revealMove(gameId, RockPaperScissors.Move.Rock, nonce2);
        
        RockPaperScissors.Game memory g = game.getGame(gameId);
        assertEq(g.winner, address(0)); // Draw
    }
}