pragma solidity 0.8.24;

interface ISushiSwapV2Factory {
    /// @notice Get the pair address for two tokens
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pair Pair address (zero if none exists)
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /// @notice Create a new trading pair
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pair Address of the newly created pair
    function createPair(address tokenA, address tokenB) external returns (address pair);

    /// @notice Get the limit order book address
    /// @return Address of the limit order book
    function limitOrderBook() external view returns (address);

    /// @notice Set the limit order book address
    /// @param _limitOrderBook Address of the limit order book
    function setLimitOrderBook(address _limitOrderBook) external;
}
