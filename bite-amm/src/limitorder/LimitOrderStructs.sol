pragma solidity 0.8.24;

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
    }

    /// @notice Price condition check result
    /// @param met Whether the price condition was met
    /// @param outputAmount Expected output amount if executed
    struct PriceCheck {
        bool met;
        uint256 outputAmount;
    }
}
