pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../../src/amm/BiteSwapV2Factory.sol";
import "../../src/amm/BiteSwapV2Pair.sol";
import "../../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../../src/limitorder/LimitOrderStructs.sol";
import "../../src/MockToken.sol";

contract LimitOrderTest is Test {
    BiteSwapV2Factory factory;
    ConfidentialLimitOrderBook lob;
    BiteSwapV2Pair pair;
    MockToken tokenA;
    MockToken tokenB;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        // Give alice and bob ETH
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        // Deploy tokens
        vm.prank(alice);
        tokenA = new MockToken("Token A", "TKNA", true, 18);
        vm.prank(alice);
        tokenB = new MockToken("Token B", "TKNB", true, 18);

        // Deploy factory
        vm.prank(alice);
        factory = new BiteSwapV2Factory();

        // Deploy LOB
        vm.prank(alice);
        lob = new ConfidentialLimitOrderBook();

        // Configure
        vm.prank(alice);
        lob.setFactory(address(factory));
        vm.prank(alice);
        factory.setLimitOrderBook(address(lob));

        // Create pair
        vm.prank(alice);
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        pair = BiteSwapV2Pair(pairAddr);

        // Mint tokens to bob
        vm.prank(alice);
        tokenA.mint(bob, 100_000 * 10 ** 18);
        vm.prank(alice);
        tokenB.mint(bob, 100_000 * 10 ** 18);

        // Add liquidity
        vm.startPrank(bob);
        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);
        tokenA.transfer(address(pair), 10_000 * 10 ** 18);
        tokenB.transfer(address(pair), 10_000 * 10 ** 18);
        pair.mint(bob);
        vm.stopPrank();
    }

    function testSubmitLimitOrder() public {
        // Mock encrypted data (would use bite-ts in production)
        bytes memory encryptedPrice = abi.encode(100 * 10 ** 18);
        bytes memory encryptedAmount = abi.encode(10 * 10 ** 18);
        bytes memory signature = _generateMockSignature();

        vm.startPrank(bob);
        lob.submitLimitOrder{value: 0.01 ether}(
            address(pair),
            encryptedPrice,
            encryptedAmount,
            true, // token0 -> token1
            0, // no deadline
            signature
        );
        vm.stopPrank();

        assertEq(lob.getOrderCount(address(pair)), 1);
        assertEq(lob.userGasBalance(bob), 0.01 ether);
    }

    function testSubmitLimitOrderInsufficientGas() public {
        bytes memory encryptedPrice = abi.encode(100 * 10 ** 18);
        bytes memory encryptedAmount = abi.encode(10 * 10 ** 18);
        bytes memory signature = _generateMockSignature();

        vm.prank(bob);
        vm.expectRevert(ConfidentialLimitOrderBook.InsufficientGasPayment.selector);
        lob.submitLimitOrder{value: 0.001 ether}(address(pair), encryptedPrice, encryptedAmount, true, 0, signature);
    }

    function testCancelOrder() public {
        bytes memory encryptedPrice = abi.encode(100 * 10 ** 18);
        bytes memory encryptedAmount = abi.encode(10 * 10 ** 18);
        bytes memory signature = _generateMockSignature();

        vm.startPrank(bob);
        lob.submitLimitOrder{value: 0.01 ether}(address(pair), encryptedPrice, encryptedAmount, true, 0, signature);

        lob.cancelOrder(address(pair), 0);
        vm.stopPrank();

        (, bool active) = _getOrderActive(lob, address(pair), 0);
        assertFalse(active);
    }

    function testCancelNotYourOrder() public {
        bytes memory encryptedPrice = abi.encode(100 * 10 ** 18);
        bytes memory encryptedAmount = abi.encode(10 * 10 ** 18);
        bytes memory signature = _generateMockSignature();

        vm.prank(bob);
        lob.submitLimitOrder{value: 0.01 ether}(address(pair), encryptedPrice, encryptedAmount, true, 0, signature);

        vm.prank(alice);
        vm.expectRevert(ConfidentialLimitOrderBook.NotYourOrder.selector);
        lob.cancelOrder(address(pair), 0);
    }

    function testDepositGas() public {
        vm.prank(bob);
        lob.depositGas{value: 1 ether}();

        assertEq(lob.userGasBalance(bob), 1 ether);
    }

    function testWithdrawGas() public {
        vm.startPrank(bob);
        lob.depositGas{value: 1 ether}();
        lob.withdrawGas(0.5 ether);
        vm.stopPrank();

        assertEq(lob.userGasBalance(bob), 0.5 ether);
    }

    function testWithdrawInsufficientBalance() public {
        vm.prank(bob);
        lob.depositGas{value: 0.1 ether}();

        vm.prank(bob);
        vm.expectRevert(ConfidentialLimitOrderBook.InsufficientGasBalance.selector);
        lob.withdrawGas(1 ether);
    }

    function testCheckOrdersOnlyCallableByPair() public {
        // alice is not a valid pool (factory is set, so _isValidPool checks)
        vm.prank(alice);
        vm.expectRevert();
        lob.checkOrders(address(alice));
    }

    // Helper function to check order active status
    function _getOrderActive(ConfidentialLimitOrderBook _lob, address pool, uint256 orderId)
        internal
        view
        returns (address, bool)
    {
        LimitOrderStructs.LimitOrder memory order = _lob.getOrder(pool, orderId);
        return (order.maker, order.active);
    }

    // Helper to generate a mock signature (65 bytes)
    function _generateMockSignature() internal pure returns (bytes memory) {
        bytes memory signature = new bytes(65);
        // Fill with dummy data (r, s, v)
        bytes32 r = bytes32(uint256(1));
        bytes32 s = bytes32(uint256(2));
        uint8 v = 27;
        assembly {
            mstore(add(signature, 32), r)
            mstore(add(signature, 64), s)
            mstore(add(signature, 96), v)
        }
        return signature;
    }
}
