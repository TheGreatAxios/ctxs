pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/limitorder/LimitOrderStructs.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";

interface ILOB {
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
}

contract AnalyzeOrderTrigger is Script {
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;

    function run() external view {
        IBiteSwapV2Pair pair = IBiteSwapV2Pair(USDC_WETH_PAIR);
        ILOB lob = ILOB(LOB);

        // Get order
        LimitOrderStructs.LimitOrder memory order = lob.getOrder(USDC_WETH_PAIR, 0);

        // Get reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        address token1 = pair.token1();

        console.log("=== Pool State ===");
        console.log("token0:", token0);
        console.log("token1:", token1);
        console.log("reserve0 (WETH):", reserve0);
        console.log("reserve1 (USDC):", reserve1);

        console.log("\n=== Order Details ===");
        console.log("maker:", order.maker);
        console.log("direction:", order.direction);
        console.log("direction meaning:", order.direction ? "token0->token1 (sell WETH)" : "token1->token0 (sell USDC)");

        // Since order values are encrypted, we can't see the exact target
        // But we can calculate the current output for direction=false
        // direction=false means selling token1 (USDC) to get token0 (WETH)

        console.log("\n=== Price Analysis ===");
        uint256 wethReserve = token0 == WETH ? reserve0 : reserve1;
        uint256 usdcReserve = token0 == WETH ? reserve1 : reserve0;

        // For direction=false (USDC -> WETH): calculate how much WETH you'd get for some USDC
        uint256 testUsdcAmount = 3000e6; // 3000 USDC
        uint256 wethOut = getAmountOut(testUsdcAmount, usdcReserve, wethReserve);

        console.log("Current output for 3000 USDC:", wethOut / 1e18, "WETH");
        console.log("Current price (WETH per USDC):", (wethOut * 1e18) / testUsdcAmount, "WETH per USDC * 1e18");
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }
}
