pragma solidity 0.8.24;

import "forge-std/Script.sol";

interface IRouter {
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to) external returns (uint256 amountOut);
}

contract EncodeSwapCalldata is Script {
    address constant ROUTER = 0xf698c0c0556888d33d4e43c89e86C062c1FDCA96;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant RECIPIENT = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058;

    function run() external view {
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = WETH;

        bytes memory calldata_ = abi.encodeWithSelector(
            IRouter.swapExactTokensForTokens.selector,
            1000000000,      // 1000 USDC
            990000000000000000,  // min WETH out
            path,
            RECIPIENT
        );

        console.log("Calldata:");
        console.logBytes(calldata_);
        console.log("Router:", ROUTER);
    }
}
