pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TriggerSwap is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant ROUTER = 0xfDcD856d4c3Ee3c27D63a1FCDC0597226DBe91d5;
    address constant USDC = 0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE;
    address constant USDT = 0xE242b5c5D390b5777437423e9C7B13e56a7dFA59;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;
    address constant WBTC = 0x12A04EAa0e41EaDBE1b12693df3ac82cb7b81375;

    function run() external {
        vm.startBroadcast();

        // Small swap to trigger checkOrders()
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = WETH;

        // Swap 10 USDC for WETH
        uint256 amountIn = 10 * 10 ** 6;

        IERC20(USDC).approve(ROUTER, amountIn);

        console.log("Triggering swap to check orders...");
        console.log("Swapping 10 USDC -> WETH");

        uint256 amountOut = IBiteSwapV2Router(ROUTER).swapExactTokensForTokens(
            amountIn,
            0, // accept any
            path,
            msg.sender
        );

        console.log("Received:", amountOut, "wei WETH");

        vm.stopBroadcast();

        console.log("\nCheck your order in the next block!");
        console.log("The CTX will be executed and your order should fill.");
    }
}
