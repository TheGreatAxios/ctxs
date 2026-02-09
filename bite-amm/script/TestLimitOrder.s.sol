pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../src/limitorder/LimitOrderStructs.sol";

interface ILob {
    function factory() external view returns (address);
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
    function userGasBalance(address user) external view returns (uint256);
    function submitLimitOrder(
        address pool,
        bytes calldata encryptedTargetPrice,
        bytes calldata encryptedAmount,
        bool direction,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (uint256 orderId);
}

contract TestLimitOrder is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant POOL = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978; // USDC/WETH

    function run() external {
        address deployer = msg.sender; // Uses --sender address

        console.log("Testing limit order submission...");
        console.log("Deployer:", deployer);
        console.log("Factory:", FACTORY);
        console.log("LOB:", LOB);
        console.log("Pool:", POOL);

        // Check deployer's ETH balance
        uint256 ethBalance = deployer.balance;
        console.log("Deployer ETH balance:", ethBalance);
        if (ethBalance < 0.01 ether) {
            console.log("ERROR: Insufficient ETH. Need at least 0.01 ETH");
            return;
        }

        vm.startBroadcast();

        // Check factory is set on LOB
        address lobFactory = ILob(LOB).factory();
        console.log("\nLOB factory:", lobFactory);
        if (lobFactory != FACTORY) {
            console.log("ERROR: Factory mismatch on LOB!");
            vm.stopBroadcast();
            return;
        }

        // Check LOB is set on factory
        address factoryLob = IBiteSwapV2Factory(FACTORY).limitOrderBook();
        console.log("Factory LOB:", factoryLob);
        if (factoryLob != LOB) {
            console.log("ERROR: LOB mismatch on factory!");
            vm.stopBroadcast();
            return;
        }

        // Check pool exists
        address token0 = IBiteSwapV2Pair(POOL).token0();
        address token1 = IBiteSwapV2Pair(POOL).token1();
        console.log("\nPool token0:", token0);
        console.log("Pool token1:", token1);

        address factoryPool = IBiteSwapV2Factory(FACTORY).getPair(token0, token1);
        console.log("Factory.getPair result:", factoryPool);
        if (factoryPool != POOL) {
            console.log("ERROR: Pool not tracked by factory!");
            vm.stopBroadcast();
            return;
        }

        // Check existing orders
        uint256 orderCount = ILob(LOB).getOrderCount(POOL);
        console.log("\nExisting order count:", orderCount);

        // Generate a valid 65-byte signature (mock for testing)
        bytes memory signature = _generateMockSignature();
        console.log("Signature length:", signature.length);
        if (signature.length != 65) {
            console.log("ERROR: Signature must be 65 bytes!");
            vm.stopBroadcast();
            return;
        }

        // =================================================================
        // REALISTIC ORDER FOR CURRENT POOL RESERVES
        // =================================================================
        // Current reserves: ~26,000 WETH / ~51,949,093 USDC
        // Price: ~1,998 USDC per WETH
        //
        // ORDER: Swap 1000 USDC -> WETH
        // - Input amount: 1000 USDC (1000 * 10^6)
        // - Expected output: ~0.49 WETH at current price
        // - Target output: 0.47 WETH (slightly below market to ensure fill)
        //
        // Direction: true = token0 -> token1
        // token0 = WETH, token1 = USDC
        // So direction=true means WETH -> USDC
        //
        // For USDC -> WETH, we need direction = false
        // =================================================================

        bytes memory encryptedPrice = abi.encode(0.47 * 10 ** 18); // Target: 0.47 WETH out
        bytes memory encryptedAmount = abi.encode(1000 * 10 ** 6); // Input: 1000 USDC

        console.log("\nSubmitting LIMIT ORDER:");
        console.log("Input: 1000 USDC");
        console.log("Target output: 0.47 WETH");
        console.log("Direction: USDC -> WETH (false)");
        console.log("Value: 0.01 ETH for gas");

        // Submit limit order (USDC -> WETH, so direction = false since token0=WETH)
        try ILob(LOB).submitLimitOrder{value: 0.01 ether}(
            POOL,
            encryptedPrice,
            encryptedAmount,
            false, // token1 -> token0 (USDC -> WETH)
            0, // no deadline
            signature
        ) returns (
            uint256 orderId
        ) {
            console.log("\nSUCCESS! Order ID:", orderId);
            _logOrderDetails(orderId, deployer);
        } catch Error(string memory reason) {
            console.log("\nFAILED with error:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("\nFAILED with low-level error:");
            console.logBytes(lowLevelData);
        }

        vm.stopBroadcast();
    }

    function _generateMockSignature() internal pure returns (bytes memory) {
        bytes memory signature = new bytes(65);
        // Fill with valid signature format (r, s, v)
        bytes32 r = bytes32(uint256(1));
        bytes32 s = bytes32(uint256(2));
        uint8 v = 27;
        assembly {
            mstore(add(signature, 32), r)
            mstore(add(signature, 64), s)
            mstore(add(signature, 96), v)
        }
        return signature;
    }

    function _logOrderDetails(uint256 orderId, address user) internal view {
        uint256 newCount = ILob(LOB).getOrderCount(POOL);
        console.log("New order count:", newCount);

        LimitOrderStructs.LimitOrder memory order = ILob(LOB).getOrder(POOL, orderId);
        console.log("Order maker:", order.maker);
        console.log("Order active:", order.active);
        console.log("Order nonce:", order.nonce);

        uint256 gasBalance = ILob(LOB).userGasBalance(user);
        console.log("User gas balance:", gasBalance);
    }
}
