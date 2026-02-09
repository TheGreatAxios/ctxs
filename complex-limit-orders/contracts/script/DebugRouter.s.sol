pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/amm/BiteSwapV2Library.sol";

contract DebugRouter is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant ROUTER = 0xfDcD856d4c3Ee3c27D63a1FCDC0597226DBe91d5;
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant USDC = 0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;

    function run() external view {
        address routerFactory = address(BiteSwapV2Router(ROUTER).factory());
        console.log("Router's factory:", routerFactory);

        address libraryPair = BiteSwapV2Library.pairFor(routerFactory, USDC, WETH);
        console.log("Library calculated pair:", libraryPair);

        address directPair = BiteSwapV2Router(ROUTER).pairFor(USDC, WETH);
        console.log("Router calculated pair:", directPair);
    }
}
