pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";

contract CheckFactoryConfig is Script {
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant LIMIT_ORDER_BOOK = 0x8d413a5e31F311d1f85be177D658cF468325C88c;

    function run() external view {
        IBiteSwapV2Factory factory = IBiteSwapV2Factory(FACTORY);

        address lob = factory.limitOrderBook();

        console.log("=== Factory Configuration ===");
        console.log("Factory address:", FACTORY);
        console.log("Expected LOB:", LIMIT_ORDER_BOOK);
        console.log("Actual LOB:  ", lob);
        console.log("LOB set correctly:", lob == LIMIT_ORDER_BOOK ? "YES" : "NO");
    }
}
