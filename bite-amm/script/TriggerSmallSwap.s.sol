pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TriggerSmallSwap is Script {
    address constant POOL = 0x856d16ceDC67FaeD5EbdAD091f769935298F0ecb; // WBTC/USDC
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WBTC = 0x09C6e0Fe49080e10DF7db8A0c8d64660C4d55D86;

    function run() external {
        // Get reserves and calculate swap
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(POOL).getReserves();
        address token0 = IBiteSwapV2Pair(POOL).token0();
        address token1 = IBiteSwapV2Pair(POOL).token1();

        console.log("Token0:", token0);
        console.log("Token1:", token1);

        // Small swap: 50 USDC -> WBTC
        uint256 amountIn = 50 * 10 ** 6;
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * uint256(reserve0);
        uint256 denominator = (uint256(reserve1) * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        console.log("\n=== Small Swap: 50 USDC -> WBTC ===");
        console.log("Expected output (WBTC):");
        console.logUint(amountOut / 10**8);

        // Check allowance
        uint256 allowance = IERC20(USDC).allowance(msg.sender, POOL);
        console.log("\nCurrent USDC allowance:");
        console.logUint(allowance);

        if (allowance < amountIn) {
            console.log("\nERROR: Need approval!");
            console.log("Run: cast send [USDC] \"approve(address,uint256)\" [POOL] type(uint256).max --rpc-url skale_testnet --account bite-deployer --legacy");
            return;
        }

        vm.startBroadcast();

        // Transfer USDC to pool
        IERC20(USDC).transferFrom(msg.sender, POOL, amountIn);

        // Swap: USDC -> WBTC (WBTC is token0, so amount0Out = amountOut, amount1Out = 0)
        IBiteSwapV2Pair(POOL).swap(amountOut, 0, msg.sender, "");

        vm.stopBroadcast();

        console.log("\n=== Swap Complete! ===");
        console.log("checkOrders() triggered on WBTC/USDC pool.");
        console.log("Your limit order should fill in next block via CTX.");
    }
}
