pragma solidity 0.8.24;

import "../IActionExecutor.sol";
import "../../amm/interfaces/IBiteSwapV2Pair.sol";
import "../ActionTypes.sol";

contract AMMSwapActionExecutor is IActionExecutor {
    /// @notice Execute AMM swap action
    /// @param action Encoded action (pool, to, amountInMax, nonce, v, r, s)
    /// @param conditionContext Output amount from condition checker
    /// @return success Whether swap succeeded
    /// @return result Execution result (error data if failed)
    function executeAction(bytes calldata action, bytes calldata conditionContext)
        external
        override
        returns (bool success, bytes memory result)
    {
        (address pool, address to, uint256 amountInMax, uint256 nonce, uint8 v, bytes32 r, bytes32 s) =
            abi.decode(action, (address, address, uint256, uint256, uint8, bytes32, bytes32));

        uint256 outputAmount = abi.decode(conditionContext, (uint256));

        // Determine direction from output amounts
        // For simplicity, assuming we need to know direction externally
        // In practice, this would be encoded in actionData
        uint256 amount0Out;
        uint256 amount1Out;

        // This is a simplified version - actual implementation would need
        // direction info to determine which token is output
        try IBiteSwapV2Pair(pool).fillLimitOrder(amount0Out, amount1Out, to, amountInMax, nonce, v, r, s) {
            return (true, "");
        } catch Error(string memory reason) {
            return (false, bytes(reason));
        } catch (bytes memory lowLevelData) {
            return (false, lowLevelData);
        }
    }
}
