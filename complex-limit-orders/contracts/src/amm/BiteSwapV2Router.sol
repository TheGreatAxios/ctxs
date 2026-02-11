pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../amm/interfaces/IBiteSwapV2Factory.sol";
import "../amm/interfaces/IBiteSwapV2Pair.sol";
import "./BiteSwapV2Library.sol";

// Interface for WETH (Wrapped Ether)
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/**
 * @title BiteSwap V2 Router
 * @notice Handles token swaps via BiteSwap V2 pairs
 * @dev Based on UniswapV2Router02 with BITE V2 compatibility
 */
contract BiteSwapV2Router {
    error InsufficientOutputAmount();
    error InsufficientLiquidity();
    error InvalidPath();
    error Expired();
    error ExcessiveInputAmount();

    IBiteSwapV2Factory public immutable factory;
    address public immutable WETH;

    constructor(IBiteSwapV2Factory _factory, address _weth) {
        factory = _factory;
        WETH = _weth;
    }

    // ===== View Functions =====

    /**
     * @notice Get the address of the pair for two tokens
     */
    function pairFor(address tokenA, address tokenB) external view returns (address pair) {
        return factory.getPair(tokenA, tokenB);
    }

    // ===== Liquidity =====

    /**
     * @notice Add liquidity to a pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountADesired Desired amount of tokenA
     * @param amountBDesired Desired amount of tokenB
     * @param amountAMin Minimum amount of tokenA
     * @param amountBMin Minimum amount of tokenB
     * @param to Recipient of LP tokens
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = BiteSwapV2Library.pairFor(address(factory), tokenA, tokenB);

        // Transfer tokens from user to pair BEFORE minting
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);

        liquidity = IBiteSwapV2Pair(pair).mint(to);
        return (amountA, amountB, liquidity);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        // create pair if it doesn't exist
        if (factory.getPair(tokenA, tokenB) == address(0)) {
            factory.createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = BiteSwapV2Library.getReserves(address(factory), tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = BiteSwapV2Library.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientLiquidity();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = BiteSwapV2Library.quote(amountBDesired, reserveB, reserveA);
                if (amountAOptimal < amountAMin) revert InsufficientLiquidity();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /**
     * @notice Remove liquidity from a pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive
     * @param amountBMin Minimum amount of tokenB to receive
     * @param to Recipient of tokens
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB) {
        address pair = BiteSwapV2Library.pairFor(address(factory), tokenA, tokenB);
        IERC20(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint256 amount0, uint256 amount1) = IBiteSwapV2Pair(pair).burn(to);
        (amountA, amountB) = tokenA < tokenB ? (amount0, amount1) : (amount1, amount0);
        if (amountA < amountAMin) revert InsufficientLiquidity();
        if (amountB < amountBMin) revert InsufficientLiquidity();
    }

    // ===== Swaps =====

    /**
     * @notice Swap exact tokens for tokens
     * @param amountIn Exact amount of input tokens
     * @param amountOutMin Minimum amount of output tokens
     * @param path Array of token addresses (input -> ... -> output)
     * @param to Recipient of output tokens
     * @return amountOut Actual amount of output tokens
     */
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to)
        external
        returns (uint256 amountOut)
    {
        _safeTransferFrom(path[0], msg.sender, BiteSwapV2Library.pairFor(address(factory), path[0], path[1]), amountIn);
        uint256 balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swap(path, to);
        uint256 balanceAfter = IERC20(path[path.length - 1]).balanceOf(to);
        amountOut = balanceAfter - balanceBefore;
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();
    }

    /**
     * @notice Swap tokens for exact tokens (output amount is fixed)
     * @param amountOut Exact amount of output tokens
     * @param amountInMax Maximum amount of input tokens
     * @param path Array of token addresses (input -> ... -> output)
     * @param to Recipient of output tokens
     * @return amountIn Actual amount of input tokens
     */
    function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to)
        external
        returns (uint256 amountIn)
    {
        amountIn = BiteSwapV2Library.getAmountsIn(address(factory), amountOut, path)[0];
        if (amountIn > amountInMax) revert ExcessiveInputAmount();
        _safeTransferFrom(path[0], msg.sender, BiteSwapV2Library.pairFor(address(factory), path[0], path[1]), amountIn);
        _swap(path, to);
    }

    /**
     * @notice Swap exact ETH for tokens
     * @param amountOutMin Minimum amount of output tokens
     * @param path Array of token addresses (WETH -> ... -> output)
     * @param to Recipient of output tokens
     * @return amountOut Actual amount of output tokens
     */
    function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to)
        external
        payable
        returns (uint256 amountOut)
    {
        require(path[0] == WETH, "Invalid path");
        uint256 amountIn = msg.value;
        IWETH(WETH).deposit{value: amountIn}();
        _safeTransferFrom(WETH, address(this), BiteSwapV2Library.pairFor(address(factory), path[0], path[1]), amountIn);
        uint256 balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swap(path, to);
        uint256 balanceAfter = IERC20(path[path.length - 1]).balanceOf(to);
        amountOut = balanceAfter - balanceBefore;
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();
    }

    /**
     * @notice Swap tokens for exact ETH
     * @param amountOut Exact amount of ETH to receive
     * @param amountInMax Maximum amount of input tokens
     * @param path Array of token addresses (input -> ... -> WETH)
     * @param to Recipient of ETH
     * @return amountIn Actual amount of input tokens
     */
    function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to)
        external
        returns (uint256 amountIn)
    {
        require(path[path.length - 1] == WETH, "Invalid path");
        amountIn = BiteSwapV2Library.getAmountsIn(address(factory), amountOut, path)[0];
        if (amountIn > amountInMax) revert ExcessiveInputAmount();
        _safeTransferFrom(path[0], msg.sender, BiteSwapV2Library.pairFor(address(factory), path[0], path[1]), amountIn);
        _swap(path, address(this));
        IWETH(WETH).withdraw(amountOut);
        _safeTransferETH(to, amountOut);
    }

    /**
     * @notice Swap exact tokens for ETH
     * @param amountIn Exact amount of input tokens
     * @param amountOutMin Minimum amount of ETH to receive
     * @param path Array of token addresses (input -> ... -> WETH)
     * @param to Recipient of ETH
     * @return amountOut Actual amount of ETH received
     */
    function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to)
        external
        returns (uint256 amountOut)
    {
        require(path[path.length - 1] == WETH, "Invalid path");
        amountOut = _swapExactTokensForTokens(amountIn, amountOutMin, path, address(this));
        IWETH(WETH).withdraw(amountOut);
        _safeTransferETH(to, amountOut);
    }

    function _swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to)
        internal
        returns (uint256 amountOut)
    {
        _safeTransferFrom(path[0], msg.sender, BiteSwapV2Library.pairFor(address(factory), path[0], path[1]), amountIn);
        uint256 balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swap(path, to);
        uint256 balanceAfter = IERC20(path[path.length - 1]).balanceOf(to);
        amountOut = balanceAfter - balanceBefore;
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();
    }

    // ===== Internal Functions =====

    function _swap(address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            address input = path[i];
            address output = path[i + 1];
            address pairAddr = BiteSwapV2Library.pairFor(address(factory), input, output);

            // Determine recipient
            address to;
            if (i < path.length - 2) {
                to = BiteSwapV2Library.pairFor(address(factory), output, path[i + 2]);
            } else {
                to = _to;
            }

            // Calculate output amounts
            (uint256 amount0Out, uint256 amount1Out) = _getSwapAmounts(input, output, pairAddr);

            IBiteSwapV2Pair(pairAddr).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    /// @notice Calculate swap amounts for a single hop
    function _getSwapAmounts(address input, address output, address pairAddr)
        internal
        view
        returns (uint256 amount0Out, uint256 amount1Out)
    {
        (uint256 reserveIn, uint256 reserveOut) = BiteSwapV2Library.getReserves(address(factory), input, output);
        uint256 amountIn = IERC20(input).balanceOf(pairAddr) - reserveIn;
        uint256 amountOut = BiteSwapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);

        (address token0,) = BiteSwapV2Library.sortTokens(input, output);
        if (input == token0) {
            return (0, amountOut);
        } else {
            return (amountOut, 0);
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }

    function _safeTransferETH(address to, uint256 value) internal {
        (bool success,) = to.call{value: value}(new bytes(0));
        require(success, "ETH transfer failed");
    }
}
