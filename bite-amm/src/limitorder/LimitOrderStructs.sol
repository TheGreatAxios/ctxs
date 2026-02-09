pragma solidity 0.8.20;

library LimitOrderStructs {
    /// @notice Confidential limit order structure
    /// @dev All sensitive values are encrypted using BITE threshold encryption
    struct LimitOrder {
        address maker; /// Order creator address
        address pool; /// AMM pair address
        bytes encryptedTargetPrice; /// Threshold-encrypted target price (encryptTE)
        bytes encryptedAmount; /// Threshold-encrypted amount (encryptTE)
        bool direction; /// true = token0→token1, false = token1→token0
        uint256 deadline; /// Expiration timestamp (0 = no expiry)
        uint256 nonce; /// User-specific nonce for order identification
        bool active; /// Order status flag
        bool gasDeducted; /// Track if gas was deducted (prevent double-spend on cancel)
        bytes32 orderHash; /// Hash of signed intent for verification
        bytes signature; /// Compact vrs signature for fillLimitOrder authorization
        bool ctxProcessing; /// CTX submitted, awaiting execution
        uint256 lastProcessedBlock; /// Track block of last processing
    }

    /// @notice Price condition check result
    /// @param met Whether the price condition was met
    /// @param outputAmount Expected output amount if executed
    struct PriceCheck {
        bool met;
        uint256 outputAmount;
    }
}
