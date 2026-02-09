pragma solidity 0.8.20;

import "../amm/interfaces/IBiteSwapV2Factory.sol";
import "../amm/interfaces/IBiteSwapV2Pair.sol";
import "../amm/BiteSwapV2Pair.sol";

/**
 * @title BiteSwap V2 Library
 * @notice Helper library for AMM calculations
 */
library BiteSwapV2Library {
    error IdenticalAddresses();
    error ZeroAddress();
    error PairNotExists();
    error InsufficientOutputAmount();

    /**
     * @notice Sort two tokens by address
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return token0 Lower address token
     * @return token1 Higher address token
     */
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
    }

    /**
     * @notice Calculate the CREATE2 address for a pair
     * @param factory Factory address
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Pair address
     */
    function pairFor(address factory, address tokenA, address tokenB) internal view returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        bytes32 initCodeHash = keccak256(type(BiteSwapV2Pair).creationCode);
        pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff", // init code hash prefix
                            factory,
                            keccak256(abi.encodePacked(token0, token1)),
                            initCodeHash
                        )
                    )
                )
            )
        );
    }

    /**
     * @notice Fetch reserves for a pair
     * @param factory Factory address
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(address factory, address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1,) = IBiteSwapV2Pair(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @notice Quote output amount for given input (reserves)
     * @param amountA Amount of tokenA
     * @param reserveA Reserve of tokenA
     * @param reserveB Reserve of tokenB
     * @return amountB Amount of tokenB
     */
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        if (amountA == 0) revert InsufficientOutputAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientOutputAmount();
        amountB = (amountA * reserveB) / reserveA;
    }

    /**
     * @notice Get input amount for exact output (one hop)
     * @param factory Factory address
     * @param amountOut Desired output amount
     * @param path Token path
     * @return amounts Input amounts for each hop
     */
    function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @notice Get output amount for given input (one hop)
     * @param factory Factory address
     * @param amountIn Input amount
     * @param path Token path
     * @return amounts Output amounts for each hop
     */
    function getAmountsOut(address factory, uint256 amountIn, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @notice Calculate output amount using constant product formula
     * @param amountIn Input amount
     * @param reserveIn Input reserve
     * @param reserveOut Output reserve
     * @return amountOut Output amount
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientOutputAmount();
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Calculate input amount for exact output
     * @param amountOut Desired output amount
     * @param reserveIn Input reserve
     * @param reserveOut Output reserve
     * @return amountIn Required input amount
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountIn)
    {
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientOutputAmount();
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @notice Calculate output amounts for a swap step
     * @param pair Pair address
     * @param input Input token address
     * @param output Output token address
     * @return amount0Out Amount of token0 out
     * @return amount1Out Amount of token1 out
     */
    function getSwapAmounts(address pair, address input, address output)
        internal
        view
        returns (uint256 amount0Out, uint256 amount1Out)
    {
        (address token0,) = sortTokens(input, output);
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(pair).getReserves();
        uint256 balanceIn = IERC20(input).balanceOf(pair);
        uint256 reserveIn = input == token0 ? reserve0 : reserve1;
        uint256 reserveOut = input == token0 ? reserve1 : reserve0;
        uint256 amountIn = balanceIn - reserveIn;
        uint256 out = getAmountOut(amountIn, reserveIn, reserveOut);
        if (input == token0) {
            return (0, out);
        } else {
            return (out, 0);
        }
    }
}
