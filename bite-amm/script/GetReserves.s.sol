pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";

contract GetReserves is Script {
    address constant POOL = 0xF4FF9d2A6c0fe0E343fb8bb47199F73Bc076378D;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;

    function run() external view {
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(POOL).getReserves();

        console.log("=== Pool Reserves ===");
        console.log("Reserve0:", uint256(reserve0));
        console.log("Reserve1:", uint256(reserve1));

        address token0 = IBiteSwapV2Pair(POOL).token0();
        address token1 = IBiteSwapV2Pair(POOL).token1();

        console.log("\n=== Tokens ===");
        console.log("Token0:", token0);
        console.log("Token1:", token1);

        if (token0 == USDC) {
            console.log("\nUSDC Reserve:", uint256(reserve0) / 1e6);
        } else {
            console.log("\nUSDC Reserve:", uint256(reserve1) / 1e6);
        }

        if (token1 == WETH) {
            console.log("WETH Reserve:", uint256(reserve1) / 1e18);
        } else {
            console.log("WETH Reserve:", uint256(reserve0) / 1e18);
        }

        // Calculate price
        uint256 usdcReserve = token0 == USDC ? uint256(reserve0) : uint256(reserve1);
        uint256 wethReserve = token1 == WETH ? uint256(reserve1) : uint256(reserve0);

        if (wethReserve > 0) {
            uint256 price = (usdcReserve * 1e18) / wethReserve;
            console.log("\nPrice (USDC per WETH):", price / 1e18);
        }

        // Calculate sample swap: 1000 USDC -> WETH
        uint256 amountIn = 1000 * 1e6;
        uint256 reserveIn = usdcReserve;
        uint256 reserveOut = wethReserve;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        console.log("\n=== Sample Swap ===");
        console.log("Input: 1000 USDC");
        console.log("Output (wei):");
        console.logUint(amountOut);
        console.log("Output (WETH):");
        console.logUint(amountOut / 1e18);
        console.log("Target for limit order (99% wei):");
        console.logUint(amountOut * 99 / 100);
    }
}
