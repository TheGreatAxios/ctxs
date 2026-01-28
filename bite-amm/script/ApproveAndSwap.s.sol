pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ApproveAndSwap is Script {
    address constant ROUTER = 0x689Afad46B3EB17E734CF4aB1d8307CB520E5BD4;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant RECIPIENT = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058;

    function run() external {
        vm.startBroadcast();

        // Approve router
        console.log("Approving USDC...");
        IERC20(USDC).approve(ROUTER, type(uint256).max);

        // Swap
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = WETH;

        console.log("Swapping 1000 USDC -> WETH...");
        IBiteSwapV2Router(ROUTER).swapExactTokensForTokens(
            1000 * 10 ** 6,
            0,
            path,
            RECIPIENT
        );

        vm.stopBroadcast();
    }
}
