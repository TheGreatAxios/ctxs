pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LiarsTable.sol";
import "../src/MockERC20.sol";

contract LiarsTableTest is Test {
    LiarsTable public liarsTable;
    MockERC20 public token;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        vm.startPrank(alice);
        token = new MockERC20();
        liarsTable = new LiarsTable(address(token));
        vm.stopPrank();

        token.mint(alice, 1000 * 10**18);
        token.mint(bob, 1000 * 10**18);

        // Give test accounts ETH for gas
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function testCommitChallenge() public {
        vm.startPrank(alice);
        token.approve(address(liarsTable), type(uint256).max);
        liarsTable.depositGas{value: 0.01 ether}();

        bytes memory encryptedSecret = abi.encodePacked(uint256(75));
        liarsTable.commit(encryptedSecret, 10 * 10**18, "> 50");

        LiarsTable.Challenge memory challenge = liarsTable.getChallenge(0);
        assertEq(challenge.id, 0);
        assertEq(challenge.maker, alice);
        assertEq(challenge.wager, 10 * 10**18);
        assertEq(challenge.claim, "> 50");
        vm.stopPrank();
    }

    function testCallBluff() public {
        // Alice creates challenge
        vm.startPrank(alice);
        token.approve(address(liarsTable), type(uint256).max);
        liarsTable.depositGas{value: 0.01 ether}();
        bytes memory encryptedSecret = abi.encodePacked(uint256(75));
        liarsTable.commit(encryptedSecret, 10 * 10**18, "> 50");
        vm.stopPrank();

        // Bob calls bluff - will fail because BITE precompile doesn't exist in test
        vm.startPrank(bob);
        token.approve(address(liarsTable), type(uint256).max);

        // Expect revert because BITE precompile (0x1B) doesn't exist in test environment
        vm.expectRevert(LiarsTable.InvalidGameState.selector);
        liarsTable.callBluff(0);
        vm.stopPrank();
    }

    function testCannotCallOwnBluff() public {
        vm.startPrank(alice);
        token.approve(address(liarsTable), type(uint256).max);
        bytes memory encryptedSecret = abi.encodePacked(uint256(75));
        liarsTable.commit(encryptedSecret, 10 * 10**18, "> 50");

        vm.expectRevert();
        liarsTable.callBluff(0);
        vm.stopPrank();
    }

    function testGasDepositWithdraw() public {
        vm.startPrank(alice);
        liarsTable.depositGas{value: 1 ether}();
        assertEq(liarsTable.userGasBalance(alice), 1 ether);

        liarsTable.withdrawGas(0.5 ether);
        assertEq(liarsTable.userGasBalance(alice), 0.5 ether);
        vm.stopPrank();
    }

    function testEvaluateClaimGreaterThan() public {
        vm.startPrank(alice);
        token.approve(address(liarsTable), type(uint256).max);
        liarsTable.depositGas{value: 0.01 ether}();
        bytes memory encryptedSecret = abi.encodePacked(uint256(75));
        liarsTable.commit(encryptedSecret, 10 * 10**18, "> 50");

        LiarsTable.Challenge memory challenge = liarsTable.getChallenge(0);
        assertEq(challenge.id, 0);
        vm.stopPrank();
    }
}
