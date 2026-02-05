pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";

contract DebugSwapTx is Script {
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;

    function run() external view {
        IBiteSwapV2Pair pair = IBiteSwapV2Pair(USDC_WETH_PAIR);

        // Get current reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        address token1 = pair.token1();

        console.log("=== Current Pool State ===");
        console.log("token0:", token0);
        console.log("token1:", token1);
        console.log("token0 is WETH?", token0 == WETH ? "YES" : "NO");
        console.log("reserve0:", uint256(reserve0));
        console.log("reserve1:", uint256(reserve1));

        // Calculate prices
        uint256 wethReserve = token0 == WETH ? reserve0 : reserve1;
        uint256 usdcReserve = token0 == WETH ? reserve1 : reserve0;

        // Price of WETH in USDC
        uint256 wethPriceInUsdc = (usdcReserve * 1e18) / wethReserve;
        console.log("\nWETH price (USDC per WETH):", wethPriceInUsdc / 1e12, "USDC");

        // If you swap 1 WETH now, how much USDC do you get?
        uint256 usdcOutFor1Weth = getAmountOut(1e18, wethReserve, usdcReserve);
        console.log("Output for 1 WETH:", usdcOutFor1Weth / 1e6, "USDC");

        // If you swap 3000 USDC, how much WETH do you get?
        uint256 wethOutFor3kUsdc = getAmountOut(3000e6, usdcReserve, wethReserve);
        console.log("Output for 3000 USDC (wei):", wethOutFor3kUsdc);
        console.log("Output for 3000 USDC (WETH):", wethOutFor3kUsdc / 1e18);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }
}
