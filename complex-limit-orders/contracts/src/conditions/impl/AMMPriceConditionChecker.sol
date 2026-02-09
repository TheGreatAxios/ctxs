pragma solidity 0.8.20;

import "../IConditionChecker.sol";
import "../../amm/interfaces/IBiteSwapV2Pair.sol";
import "../ConditionTypes.sol";

contract AMMPriceConditionChecker is IConditionChecker {
    /// @notice Check if AMM price condition is met
    /// @param condition Encoded condition (pool address, direction, amount)
    /// @param decryptedValue Target price (minimum output amount)
    /// @return met Whether condition satisfied
    /// @return context Output amount if condition met
    function checkCondition(bytes calldata condition, uint256 decryptedValue)
        external
        view
        override
        returns (bool met, bytes memory context)
    {
        (address pool, bool direction, uint256 amount) = abi.decode(condition, (address, bool, uint256));

        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(pool).getReserves();

        uint256 outputAmount;
        if (direction) {
            // token0 → token1
            outputAmount = _getAmountOut(amount, reserve0, reserve1);
        } else {
            // token1 → token0
            outputAmount = _getAmountOut(amount, reserve1, reserve0);
        }

        met = outputAmount >= decryptedValue;
        context = abi.encode(outputAmount);
    }

    /// @notice Calculate output amount using x*y=k formula
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
