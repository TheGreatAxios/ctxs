pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../src/amm/BiteSwapV2Pair.sol";
import "../../src/amm/BiteSwapV2Factory.sol";
import "../../src/MockToken.sol";

contract PairTest is Test {
    BiteSwapV2Factory factory;
    BiteSwapV2Pair pair;
    MockToken tokenA;
    MockToken tokenB;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    function setUp() public {
        // Deploy tokens
        vm.prank(alice);
        tokenA = new MockToken("Token A", "TKNA", true, 18);
        vm.prank(alice);
        tokenB = new MockToken("Token B", "TKNB", true, 18);

        // Deploy factory
        vm.prank(alice);
        factory = new BiteSwapV2Factory();

        // Create pair
        vm.prank(alice);
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        pair = BiteSwapV2Pair(pairAddr);

        // Mint tokens to bob
        vm.prank(alice);
        tokenA.mint(bob, 100_000 * 10 ** 18);
        vm.prank(alice);
        tokenB.mint(bob, 100_000 * 10 ** 18);
    }

    function testInitialState() public view {
        assertEq(pair.token0(), address(tokenA) < address(tokenB) ? address(tokenA) : address(tokenB));
        assertEq(pair.factory(), address(factory));
        assertEq(pair.totalSupply(), 0);
    }

    function testAddLiquidity() public {
        uint256 amountA = 1000 * 10 ** 18;
        uint256 amountB = 1000 * 10 ** 18;

        vm.startPrank(bob);
        tokenA.approve(address(pair), amountA);
        tokenB.approve(address(pair), amountB);

        tokenA.transfer(address(pair), amountA);
        tokenB.transfer(address(pair), amountB);

        pair.mint(bob);
        vm.stopPrank();

        assertGt(pair.totalSupply(), 0);
        assertEq(pair.balanceOf(bob), pair.totalSupply() - 1000); // 1000 burned for MINIMUM_LIQUIDITY
    }

    function testSwap() public {
        // Add liquidity first
        uint256 amountA = 10_000 * 10 ** 18;
        uint256 amountB = 10_000 * 10 ** 18;

        vm.startPrank(bob);
        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);

        tokenA.transfer(address(pair), amountA);
        tokenB.transfer(address(pair), amountB);
        pair.mint(bob);

        // Calculate expected output
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 amountIn = 100 * 10 ** 18;
        uint256 amountOut = pair.getAmountOut(amountIn, uint256(reserve0), uint256(reserve1));

        // Perform swap
        address token0 = pair.token0();
        if (token0 == address(tokenA)) {
            tokenA.transfer(address(pair), amountIn);
            pair.swap(0, amountOut, bob, "");
        } else {
            tokenB.transfer(address(pair), amountIn);
            pair.swap(amountOut, 0, bob, "");
        }
        vm.stopPrank();

        // Verify bob received tokens
        assertGt(pair.balanceOf(bob), 0);
    }

    function testSwapRevertsIfInsufficientLiquidity() public {
        vm.startPrank(bob);
        tokenA.approve(address(pair), type(uint256).max);

        vm.expectRevert();
        pair.swap(100 * 10 ** 18, 0, bob, "");
        vm.stopPrank();
    }

    function testGetAmountOut() public view {
        uint256 amountIn = 1000 * 10 ** 18;
        uint256 reserveIn = 100_000 * 10 ** 18;
        uint256 reserveOut = 100_000 * 10 ** 18;

        uint256 amountOut = BiteSwapV2Pair(address(pair)).getAmountOut(amountIn, reserveIn, reserveOut);

        // Output should be less than input due to fees
        assertLt(amountOut, amountIn);
        assertGt(amountOut, 0);
    }

    function testRemoveLiquidity() public {
        // Add liquidity first
        uint256 amountA = 1000 * 10 ** 18;
        uint256 amountB = 1000 * 10 ** 18;

        vm.startPrank(bob);
        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);

        tokenA.transfer(address(pair), amountA);
        tokenB.transfer(address(pair), amountB);
        pair.mint(bob);

        uint256 liquidity = pair.balanceOf(bob);

        // Uniswap V2 pattern: transfer LP tokens to pair, then burn
        pair.approve(address(pair), liquidity);
        pair.transfer(address(pair), liquidity);
        pair.burn(bob);
        vm.stopPrank();

        // Verify LP tokens burned (bob should have 0)
        assertEq(pair.balanceOf(bob), 0);
    }
}
