pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "../src/limitorder/LimitOrderStructs.sol";

interface ILob {
    function factory() external view returns (address);
    function getOrderCount(address pool) external view returns (uint256);
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory);
    function submitLimitOrder(
        address pool,
        bytes calldata encryptedTargetPrice,
        bytes calldata encryptedAmount,
        bool direction,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (uint256 orderId);
}

contract TestLimitOrderWBTC is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant POOL = 0xE93B97B1022Be5ea1f0e00E2bC33F6BA8E8009c4; // USDC/WBTC

    function run() external {
        console.log("=== Submitting WBTC/USDC Limit Order ===");
        console.log("Pool:", POOL);
        console.log("LOB:", LOB);

        vm.startBroadcast();

        // Generate mock signature
        bytes memory signature = _generateMockSignature();

        // ORDER: 100 USDC -> 0.0045 WBTC
        // Direction: check pool tokens first
        address token0 = IBiteSwapV2Pair(POOL).token0();
        address token1 = IBiteSwapV2Pair(POOL).token1();
        console.log("Token0:", token0);
        console.log("Token1:", token1);

        // For USDC -> WBTC, need to know direction
        // If token0=WBTC, token1=USDC, then USDC->WBTC = false (token1->token0)

        bytes memory encryptedPrice = abi.encode(0.0045 * 10 ** 8); // Target: 0.0045 WBTC (8 decimals)
        bytes memory encryptedAmount = abi.encode(100 * 10 ** 6); // Input: 100 USDC

        console.log("\nOrder: 100 USDC -> 0.0045 WBTC");
        console.log("Value: 0.01 ETH for gas");

        try ILob(LOB).submitLimitOrder{value: 0.01 ether}(
            POOL,
            encryptedPrice,
            encryptedAmount,
            false, // USDC -> WBTC (token1 -> token0)
            0,
            signature
        ) returns (
            uint256 orderId
        ) {
            console.log("\nSUCCESS! Order ID:", orderId);

            uint256 newCount = ILob(LOB).getOrderCount(POOL);
            console.log("Total orders:", newCount);
        } catch Error(string memory reason) {
            console.log("\nFAILED:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("\nFAILED with low-level error:");
            console.logBytes(lowLevelData);
        }

        vm.stopBroadcast();
    }

    function _generateMockSignature() internal pure returns (bytes memory) {
        bytes memory signature = new bytes(65);
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
}
