pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";

contract CalculateTriggerAmount is Script {
    // Deployed addresses
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;

    // Order parameters
    uint256 constant ORDER_AMOUNT = 1e18; // 1 WETH
    uint256 constant TARGET_PRICE = 3000e6; // 3000 USDC (6 decimals)

    function run() external view {
        IBiteSwapV2Pair pair = IBiteSwapV2Pair(USDC_WETH_PAIR);

        // Get current reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        address token1 = pair.token1();

        console.log("=== USDC-WETH Pool State ===");
        console.log("token0:", token0);
        console.log("token1:", token1);
        console.log("reserve0:", reserve0);
        console.log("reserve1:", reserve1);

        // Determine which is WETH
        uint256 wethReserve = token0 == WETH ? reserve0 : reserve1;
        uint256 usdcReserve = token0 == WETH ? reserve1 : reserve0;

        console.log("\nWETH reserve:", wethReserve);
        console.log("USDC reserve:", usdcReserve);

        // Calculate current price (USDC per WETH)
        uint256 currentPrice = (usdcReserve * 1e18) / wethReserve;
        console.log("\nCurrent price (USDC per 1 WETH):", currentPrice / 1e12, "USDC");

        // Calculate current output for 1 WETH
        uint256 currentOutput = getAmountOut(ORDER_AMOUNT, wethReserve, usdcReserve);
        console.log("Current output for 1 WETH:", currentOutput / 1e6, "USDC");
        console.log("Target output (trigger):", TARGET_PRICE / 1e6, "USDC");
        console.log("Need price increase:", ((TARGET_PRICE - currentOutput) * 100) / currentOutput, "basis points");

        // Binary search for amount of USDC needed to reach target price
        uint256 low = 0;
        uint256 high = usdcReserve; // Can't swap more than reserve
        uint256 answer = 0;

        for (uint256 i = 0; i < 64; i++) {
            if (low >= high) break;

            uint256 mid = (low + high) / 2;
            // Simulate swap: USDC in, WETH out
            uint256 wethOut = getAmountOut(mid, usdcReserve, wethReserve);

            // New reserves after swap
            uint256 newWethReserve = wethReserve + wethOut;
            uint256 newUsdcReserve = usdcReserve - mid;

            // Check if order would trigger with new reserves
            uint256 newOutput = getAmountOut(ORDER_AMOUNT, newWethReserve, newUsdcReserve);

            if (newOutput >= TARGET_PRICE) {
                answer = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        console.log("\n=== TRIGGER CALCULATION ===");
        console.log("USDC needed to swap:", answer / 1e6, "USDC");
        console.log("WETH received from swap:", getAmountOut(answer, usdcReserve, wethReserve) / 1e18, "WETH");

        // Verify
        uint256 finalWeth = wethReserve + getAmountOut(answer, usdcReserve, wethReserve);
        uint256 finalUsdc = usdcReserve - answer;
        uint256 finalOutput = getAmountOut(ORDER_AMOUNT, finalWeth, finalUsdc);
        console.log("\nFinal price for 1 WETH:", finalOutput / 1e6, "USDC");
        console.log("Order triggers:", finalOutput >= TARGET_PRICE ? "YES" : "NO");
    }

    // x*y=k formula with 0.3% fee
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }
}
