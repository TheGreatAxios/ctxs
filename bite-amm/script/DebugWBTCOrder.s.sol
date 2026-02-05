pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/limitorder/LimitOrderStructs.sol";

interface ILob {
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
    function userGasBalance(address user) external view returns (uint256);
}

contract DebugWBTCOrder is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant POOL = 0xE93B97B1022Be5ea1f0e00E2bC33F6BA8E8009c4; // USDC/WBTC

    function run() external view {
        address user = msg.sender;

        console.log("=== Debugging WBTC/USDC Orders ===");
        console.log("User:", user);
        console.log("Pool:", POOL);

        uint256 orderCount = ILob(LOB).getOrderCount(POOL);
        console.log("\nTotal orders:", orderCount);

        if (orderCount == 0) {
            console.log("No orders found!");
            return;
        }

        for (uint256 i = 0; i < orderCount; i++) {
            LimitOrderStructs.LimitOrder memory order = ILob(LOB).getOrder(POOL, i);

            console.log("\n--- Order", i, "---");
            console.log("Maker:", order.maker);
            console.log("Active:", order.active);
            console.log("Gas deducted:", order.gasDeducted);
            console.log("Direction:", order.direction);
            console.log("Nonce:", order.nonce);

            if (order.maker == user) {
                console.log("*** YOUR ORDER ***");

                uint256 targetPrice = abi.decode(order.encryptedTargetPrice, (uint256));
                uint256 amount = abi.decode(order.encryptedAmount, (uint256));

                console.log("Target Price (WBTC out, raw):", targetPrice);
                console.log("Target Price (WBTC):", targetPrice / 1e8);
                console.log("Amount (USDC in, raw):", amount);
                console.log("Amount (USDC):", amount / 1e6);
            }
        }

        uint256 gasBal = ILob(LOB).userGasBalance(user);
        console.log("\n=== User Gas Balance ===");
        console.log("Balance:", gasBal);
        console.log("Balance (ETH):", gasBal / 1e18);
    }
}
