pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/amm/BiteSwapV2Library.sol";

contract DebugRouter is Script {
    address constant ROUTER = 0xf698c0c0556888d33d4e43c89e86C062c1FDCA96;
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;

    function run() external view {
        address routerFactory = address(BiteSwapV2Router(ROUTER).factory());
        console.log("Router's factory:", routerFactory);

        address libraryPair = BiteSwapV2Library.pairFor(routerFactory, USDC, WETH);
        console.log("Library calculated pair:", libraryPair);

        address directPair = BiteSwapV2Router(ROUTER).pairFor(USDC, WETH);
        console.log("Router calculated pair:", directPair);
    }
}
