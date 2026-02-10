pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/TrustGame.sol";
import "../src/MockERC20.sol";

contract TrustGameTest is Test {
    TrustGame public game;
    MockERC20 public token;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        vm.startPrank(alice);
        token = new MockERC20();
        game = new TrustGame(address(token));
        vm.stopPrank();

        // Fund Alice and Bob with tokens
        token.mint(alice, 1000 * 10**18);
        token.mint(bob, 1000 * 10**18);

        // Give test accounts ETH for gas
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function testJoinQueue() public {
        vm.startPrank(alice);
        token.approve(address(game), type(uint256).max);
        game.depositGas{value: 0.01 ether}();

        bytes memory encryptedMove = abi.encodePacked(uint8(0)); // COOPERATE
        game.joinGame(encryptedMove);

        (address queuePlayer,) = game.getCurrentQueue();
        assertEq(queuePlayer, alice);
        assertTrue(game.isPlayerInQueue(alice));
        vm.stopPrank();
    }

    function testGameStart() public {
        // Alice joins queue
        vm.startPrank(alice);
        token.approve(address(game), type(uint256).max);
        game.depositGas{value: 0.01 ether}();
        bytes memory encryptedMoveA = abi.encodePacked(uint8(0));
        game.joinGame(encryptedMoveA);
        vm.stopPrank();

        // Bob joins - will try to submit CTX but precompile doesn't exist in test
        // In production, the BITE precompile at 0x1B would handle CTX submission
        vm.startPrank(bob);
        token.approve(address(game), type(uint256).max);
        bytes memory encryptedMoveB = abi.encodePacked(uint8(1));

        // Expect revert because BITE precompile (0x1B) doesn't exist in test environment
        vm.expectRevert(TrustGame.InvalidGameState.selector);
        game.joinGame(encryptedMoveB);
        vm.stopPrank();
    }

    function testLeaveQueue() public {
        vm.startPrank(alice);
        token.approve(address(game), type(uint256).max);
        bytes memory encryptedMove = abi.encodePacked(uint8(0));
        game.joinGame(encryptedMove);
        game.leaveQueue();

        (address queuePlayer,) = game.getCurrentQueue();
        assertEq(queuePlayer, address(0));
        assertFalse(game.isPlayerInQueue(alice));
        vm.stopPrank();
    }

    function testGasDepositWithdraw() public {
        vm.startPrank(alice);
        game.depositGas{value: 1 ether}();
        assertEq(game.userGasBalance(alice), 1 ether);

        game.withdrawGas(0.5 ether);
        assertEq(game.userGasBalance(alice), 0.5 ether);
        vm.stopPrank();
    }

    function testCannotJoinOwnGame() public {
        vm.startPrank(alice);
        token.approve(address(game), type(uint256).max);
        bytes memory encryptedMove = abi.encodePacked(uint8(0));
        game.joinGame(encryptedMove);

        vm.expectRevert();
        game.joinGame(encryptedMove);
        vm.stopPrank();
    }
}
