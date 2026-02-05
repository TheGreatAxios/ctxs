pragma solidity 0.8.24;

interface IConditionChecker {
    /// @notice Check if condition is met
    /// @param condition Encoded condition data
    /// @param decryptedValue Decrypted threshold from BITE
    /// @return met Whether condition satisfied
    /// @return context Additional data for action execution
    function checkCondition(bytes calldata condition, uint256 decryptedValue)
        external
        view
        returns (bool met, bytes memory context);
}
