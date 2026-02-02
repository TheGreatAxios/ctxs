pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TriggerSwap is Script {
    address constant ROUTER = 0xDB8CD65225F6e6C5F15d132296d6e87D7B1F8e33;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;

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
