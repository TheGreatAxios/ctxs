pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/GridArena.sol";
import "../src/MockERC20.sol";

contract GridArenaTest is Test {
    GridArena public arena;
    MockERC20 public token;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        vm.startPrank(alice);
        token = new MockERC20();
        arena = new GridArena(address(token));
        vm.stopPrank();

        token.mint(alice, 1000 * 10**18);
        token.mint(bob, 1000 * 10**18);

        // Give test accounts ETH for gas
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function testHidePosition() public {
        vm.startPrank(alice);
        token.approve(address(arena), type(uint256).max);
        arena.depositGas{value: 0.01 ether}();

        bytes memory encryptedLoc = abi.encodePacked(uint8(7)); // Position 7
        arena.hide(encryptedLoc);

        (address queueHider,) = arena.getCurrentQueue();
        assertEq(queueHider, alice);
        assertTrue(arena.isPlayerInQueue(alice));
        vm.stopPrank();
    }

    function testGameStart() public {
        // Alice hides
        vm.startPrank(alice);
        token.approve(address(arena), type(uint256).max);
        arena.depositGas{value: 0.01 ether}();
        bytes memory encryptedLoc = abi.encodePacked(uint8(7));
        arena.hide(encryptedLoc);
        vm.stopPrank();

        // Bob joins (this doesn't actually start the game correctly in current design)
        // Hunter needs to call hunt() separately
        vm.startPrank(bob);
        token.approve(address(arena), type(uint256).max);
        // arena.hide() for Bob - this starts the game
        arena.hide(abi.encodePacked(uint8(0)));
        vm.stopPrank();

        GridArena.Game memory game = arena.getGame(0);
        assertEq(game.id, 0);
        assertEq(game.hider, alice);
        assertEq(game.hunter, bob);
    }

    function testLeaveQueue() public {
        vm.startPrank(alice);
        token.approve(address(arena), type(uint256).max);
        bytes memory encryptedLoc = abi.encodePacked(uint8(5));
        arena.hide(encryptedLoc);
        arena.leaveQueue();

        (address queueHider,) = arena.getCurrentQueue();
        assertEq(queueHider, address(0));
        assertFalse(arena.isPlayerInQueue(alice));
        vm.stopPrank();
    }

    function testGasDepositWithdraw() public {
        vm.startPrank(alice);
        arena.depositGas{value: 1 ether}();
        assertEq(arena.userGasBalance(alice), 1 ether);

        arena.withdrawGas(0.5 ether);
        assertEq(arena.userGasBalance(alice), 0.5 ether);
        vm.stopPrank();
    }

    function testCannotJoinOwnGame() public {
        vm.startPrank(alice);
        token.approve(address(arena), type(uint256).max);
        bytes memory encryptedLoc = abi.encodePacked(uint8(3));
        arena.hide(encryptedLoc);

        vm.expectRevert();
        arena.hide(encryptedLoc);
        vm.stopPrank();
    }

    function testPackShots() public {
        // Test packing two shots into single bytes32
        uint8 shot1 = 7;
        uint8 shot2 = 12;
        uint256 packed = (uint256(shot1) << 8) | uint256(shot2);

        uint8 unpacked1 = uint8((packed >> 8) & 0xFF);
        uint8 unpacked2 = uint8(packed & 0xFF);

        assertEq(unpacked1, shot1);
        assertEq(unpacked2, shot2);
    }
}
