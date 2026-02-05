pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TriggerOrderDirect is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant POOL = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978; // USDC/WETH
    address constant USDC = 0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;

    function run() external {
        // Get pair info BEFORE broadcast (for display only)
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(POOL).getReserves();

        // Calculate swap: 10 USDC -> WETH
        uint256 amountIn = 10 * 10 ** 6; // 10 USDC
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * uint256(reserve0);
        uint256 denominator = (uint256(reserve1) * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        console.log("\n=== Swap Calculation ===");
        console.log("Input: 10 USDC");
        console.log("Expected output (wei):");
        console.logUint(amountOut);

        // Check current allowance
        uint256 currentAllowance = IERC20(USDC).allowance(msg.sender, POOL);
        console.log("\nCurrent allowance:");
        console.logUint(currentAllowance);

        if (currentAllowance < amountIn) {
            console.log("\nERROR: Insufficient allowance!");
            console.log("Please run: cast send <USDC> \"approve(address,uint256)\" <POOL> 115792089237316195423570985008687907853269984665640564039457584007913129639935 --rpc-url skale_testnet --account bite-deployer --legacy");
            return;
        }

        vm.startBroadcast();

        // Transfer USDC to pair first (allowance already set)
        IERC20(USDC).transferFrom(msg.sender, POOL, amountIn);

        // Swap directly on pair (amount0Out=amountOut, amount1Out=0, since WETH is token0)
        IBiteSwapV2Pair(POOL).swap(amountOut, 0, msg.sender, "");

        vm.stopBroadcast();

        console.log("\n=== Complete! ===");
        console.log("Swap executed. checkOrders() was called.");
        console.log("Your limit order will be processed in next block via CTX.");
    }
}
