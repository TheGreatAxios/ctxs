pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";

contract CheckFactoryConfig is Script {
    address constant FACTORY = 0x1066933816E83575A7a79173e55Af62AF4B0E684;
    address constant LIMIT_ORDER_BOOK = 0xeAbF4cD6B2f9D598fBf1626349c67184f2d64542;

    function run() external view {
        IBiteSwapV2Factory factory = IBiteSwapV2Factory(FACTORY);

        address lob = factory.limitOrderBook();
        uint256 allPairsLength = factory.allPairsLength();

        console.log("=== Factory Configuration ===");
        console.log("Factory address:", FACTORY);
        console.log("Expected LOB:", LIMIT_ORDER_BOOK);
        console.log("Actual LOB:  ", lob);
        console.log("LOB set correctly:", lob == LIMIT_ORDER_BOOK ? "YES" : "NO");
        console.log("All pairs length:", allPairsLength);

        console.log("\n=== All Pairs ===");
        for (uint256 i = 0; i < allPairsLength; i++) {
            address pair = factory.allPairs(i);
            console.log("Pair", i, ":", pair);
        }
    }
}
