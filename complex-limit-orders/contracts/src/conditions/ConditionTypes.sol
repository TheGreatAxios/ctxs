pragma solidity 0.8.20;

library ConditionTypes {
    /// @notice Condition types for conditional transactions
    enum ConditionType {
        AMM_PRICE, // Current: outputAmount >= targetPrice
        ORACLE_PRICE, // Chainlink price feed
        TOKEN_BALANCE, // Balance threshold
        CUSTOM // Arbitrary on-chain condition
    }

    /// @notice Condition structure
    /// @param conditionType Type of condition
    /// @param encryptedValue Encrypted threshold (BITE encryptTE)
    /// @param conditionChecker Address of checker contract
    /// @param conditionData Additional parameters for condition
    struct Condition {
        ConditionType conditionType;
        bytes encryptedValue;
        address conditionChecker;
        bytes conditionData;
    }
}
