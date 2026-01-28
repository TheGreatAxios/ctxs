pragma solidity 0.8.24;

interface IBiteSwapV2Pair {
    /// @notice Get the current reserves of the pair
    /// @return reserve0 Reserve of token0
    /// @return reserve1 Reserve of token1
    /// @return blockTimestampLast Timestamp of last reserve update
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    /// @notice Execute a swap through the AMM
    /// @param amount0Out Amount of token0 to receive
    /// @param amount1Out Amount of token1 to receive
    /// @param to Recipient address
    /// @param data Optional callback data
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;

    /// @notice Mint liquidity tokens to recipient
    /// @param to Recipient of liquidity tokens
    /// @return liquidity Amount of liquidity tokens minted
    function mint(address to) external returns (uint256 liquidity);

    /// @notice Burn liquidity tokens and return underlying assets
    /// @param to Recipient of underlying tokens
    /// @return amount0 Amount of token0 returned
    /// @return amount1 Amount of token1 returned
    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    /// @notice Get the address of token0
    /// @return Address of token0
    function token0() external view returns (address);

    /// @notice Get the address of token1
    /// @return Address of token1
    function token1() external view returns (address);

    /// @notice Get the factory address
    /// @return Address of the factory
    function factory() external view returns (address);
}
