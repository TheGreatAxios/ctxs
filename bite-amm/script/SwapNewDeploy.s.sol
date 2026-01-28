pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapNewDeploy is Script {
    address constant FACTORY = 0xa52BE42A286A4446D3BC07fc921Eb7F392aEe8a0;
    address constant ROUTER = 0x689Afad46B3EB17E734CF4aB1d8307CB520E5BD4;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant RECIPIENT = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058;

    function run() external {
        vm.startBroadcast();

        address pair = IBiteSwapV2Factory(FACTORY).getPair(USDC, WETH);
        console.log("Pair:", pair);

        // Add liquidity if needed
        if (pair == address(0)) {
            pair = IBiteSwapV2Factory(FACTORY).createPair(USDC, WETH);
            IERC20(USDC).transfer(pair, 1_000_000 * 10 ** 6);
            IERC20(WETH).transfer(pair, 500 * 10 ** 18);
            (bool success,) = pair.call(abi.encodeWithSignature("mint(address)", RECIPIENT));
            require(success, "Mint failed");
        }

        // Swap
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = WETH;

        IBiteSwapV2Router(ROUTER).swapExactTokensForTokens(
            1000 * 10 ** 6,
            0,
            path,
            RECIPIENT
        );

        vm.stopBroadcast();
    }
}
