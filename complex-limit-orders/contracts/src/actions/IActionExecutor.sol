pragma solidity 0.8.20;

interface IActionExecutor {
    /// @notice Execute action when condition met
    /// @param action Encoded action data
    /// @param conditionContext From condition checker
    /// @return success Whether action succeeded
    /// @return result Execution result
    function executeAction(bytes calldata action, bytes calldata conditionContext)
        external
        returns (bool success, bytes memory result);
}
