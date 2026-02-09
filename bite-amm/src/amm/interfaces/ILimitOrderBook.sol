pragma solidity 0.8.20;

interface ILimitOrderBook {
    /// @notice Check orders for a specific pool after a swap
    /// @param pool The AMM pair address
    function checkOrders(address pool) external;
}
