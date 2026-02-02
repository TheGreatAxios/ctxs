pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "../src/limitorder/LimitOrderStructs.sol";

interface ILob {
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
    function userGasBalance(address user) external view returns (uint256);
}

contract DebugOrder is Script {
    address constant LOB = 0xdDc9f2bDaD0460D38Fb1330e956A17eFD829b4eA;
    address constant POOL = 0xF4FF9d2A6c0fe0E343fb8bb47199F73Bc076378D;
    address constant ROUTER = 0xDB8CD65225F6e6C5F15d132296d6e87D7B1F8e33;

    function run() external view {
        address user = msg.sender;

        console.log("=== Debugging Order ===");
        console.log("User:", user);
        console.log("Pool:", POOL);

        // Check order count
        uint256 orderCount = ILob(LOB).getOrderCount(POOL);
        console.log("\nTotal orders:", orderCount);

        // Check each order
        for (uint256 i = 0; i < orderCount; i++) {
            LimitOrderStructs.LimitOrder memory order = ILob(LOB).getOrder(POOL, i);

            console.log("\n--- Order", i, "---");
            console.log("Maker:", order.maker);
            console.log("Active:", order.active);
            console.log("Gas deducted:", order.gasDeducted);
            console.log("Direction:", order.direction);
            console.log("Deadline:", order.deadline);
            console.log("Nonce:", order.nonce);

            if (order.maker == user) {
                console.log("*** YOUR ORDER ***");

                // Decode the encrypted data (mock, so we can read it)
                uint256 targetPrice = abi.decode(order.encryptedTargetPrice, (uint256));
                uint256 amount = abi.decode(order.encryptedAmount, (uint256));

                console.log("Target Price (WETH out):", targetPrice / 1e18);
                console.log("Amount (raw):", amount);
            }
        }

        // Check current pool reserves and calculate expected output
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(POOL).getReserves();
        console.log("\n=== Pool Reserves ===");
        console.log("Reserve0 (WETH):", uint256(reserve0) / 1e18);
        console.log("Reserve1 (USDC):", uint256(reserve1) / 1e6);

        // Calculate what 1000 USDC would get
        uint256 amountIn = 1000 * 1e6;
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * uint256(reserve0);
        uint256 denominator = (uint256(reserve1) * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        console.log("\n=== Current Swap Calculation ===");
        console.log("Input: 1000 USDC");
        console.log("Output (WETH):", amountOut / 1e18);
        console.log("Output (wei):", amountOut);

        // Check user gas balance
        uint256 gasBal = ILob(LOB).userGasBalance(user);
        console.log("\n=== User Gas ===");
        console.log("Gas balance:", gasBal);

        console.log("\n=== To Trigger Order ===");
        console.log("1. Do ANY swap on the USDC/WETH pool");
        console.log("2. This calls checkOrders() which submits CTX");
        console.log("3. Next block: onDecrypt() checks price");
        console.log("4. If outputAmount >= targetPrice, fills");
    }
}
