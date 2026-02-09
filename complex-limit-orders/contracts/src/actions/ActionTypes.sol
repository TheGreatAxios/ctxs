pragma solidity 0.8.20;

library ActionTypes {
    /// @notice Action types for conditional transactions
    enum ActionType {
        AMM_SWAP, // Current: fillLimitOrder
        TOKEN_TRANSFER, // Direct token transfer
        CONTRACT_CALL, // Arbitrary contract call
        CUSTOM
    }

    /// @notice Action structure
    /// @param actionType Type of action
    /// @param targetContract Target contract address
    /// @param actionData Encoded action parameters
    /// @param signature Authorization signature (if needed)
    struct Action {
        ActionType actionType;
        address targetContract;
        bytes actionData;
        bytes signature;
    }
}
