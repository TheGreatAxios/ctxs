pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreatePairAndSwap is Script {
    address constant FACTORY = 0xe26f0CA3867Fd6553aeC8183fdD0315dfEc61d64;
    address constant ROUTER = 0xf698c0c0556888d33d4e43c89e86C062c1FDCA96;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant RECIPIENT = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058;

    function run() external {
        vm.startBroadcast();

        // Check if pair exists
        address pair = IBiteSwapV2Factory(FACTORY).getPair(USDC, WETH);
        console.log("Pair address:", pair);

        // Create pair if it doesn't exist
        if (pair == address(0)) {
            console.log("Creating pair...");
            pair = IBiteSwapV2Factory(FACTORY).createPair(USDC, WETH);
            console.log("Created pair:", pair);
        }

        // Add liquidity first (required for swap)
        console.log("Adding liquidity...");
        IERC20(USDC).transfer(pair, 1_000_000 * 10 ** 6);
        IERC20(WETH).transfer(pair, 500 * 10 ** 18);

        (bool success,) = pair.call(abi.encodeWithSignature("mint(address)", RECIPIENT));
        require(success, "Mint failed");

        // Now swap
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = WETH;

        uint256 amountIn = 1000 * 10 ** 6;
        uint256 amountOutMin = 0;

        console.log("Executing swap...");
        IBiteSwapV2Router(ROUTER).swapExactTokensForTokens(amountIn, amountOutMin, path, RECIPIENT);

        vm.stopBroadcast();
    }
}
