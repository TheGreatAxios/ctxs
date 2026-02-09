pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/limitorder/LimitOrderStructs.sol";

interface ILOB {
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
}

contract DebugOrderState is Script {
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;

    function run() external view {
        ILOB lob = ILOB(LOB);

        uint256 orderCount = lob.getOrderCount(USDC_WETH_PAIR);
        console.log("=== Orders in USDC-WETH pool ===");
        console.log("Total orders:", orderCount);

        for (uint256 i = 0; i < orderCount; i++) {
            LimitOrderStructs.LimitOrder memory order = lob.getOrder(USDC_WETH_PAIR, i);
            console.log("\n--- Order", i, "---");
            console.log("maker:", order.maker);
            console.log("active:", order.active);
            console.log("direction:", order.direction);
            console.log("deadline:", order.deadline);
            console.log("nonce:", order.nonce);
            console.log("gasDeducted:", order.gasDeducted);
        }
    }
}
