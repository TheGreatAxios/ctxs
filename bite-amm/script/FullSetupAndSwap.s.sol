pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FullSetupAndSwap is Script {
    // Deployed addresses (Feb 2025) - checksummed
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant ROUTER = 0xfDcD856d4c3Ee3c27D63a1FCDC0597226DBe91d5;
    address constant LIMIT_ORDER_BOOK = 0x8d413a5e31F311d1f85be177D658cF468325C88c;

    // Token addresses (deployed MockTokens) - checksummed
    address constant USDC = 0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE;
    address constant USDT = 0xE242b5c5D390b5777437423e9C7B13e56a7dFA59;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;
    address constant WBTC = 0x12A04EAa0e41EaDBE1b12693df3ac82cb7b81375;

    address constant RECIPIENT = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058;

    function run() external {
        vm.startBroadcast();

        // 1. Approve all tokens on router
        console.log("=== Approving tokens ===");
        IERC20(USDC).approve(ROUTER, type(uint256).max);
        IERC20(USDT).approve(ROUTER, type(uint256).max);
        IERC20(WETH).approve(ROUTER, type(uint256).max);
        IERC20(WBTC).approve(ROUTER, type(uint256).max);
        console.log("Approved all tokens");

        // 2. Create pairs and add liquidity
        console.log("\n=== Creating pairs and adding liquidity ===");

        // USDC/WETH
        _addLiquidity(USDC, WETH, 1_000_000 * 10 ** 6, 500 * 10 ** 18);

        // USDC/WBTC
        _addLiquidity(USDC, WBTC, 1_000_000 * 10 ** 6, 50 * 10 ** 8);

        // USDT/WETH
        _addLiquidity(USDT, WETH, 1_000_000 * 10 ** 6, 500 * 10 ** 18);

        // USDT/WBTC
        _addLiquidity(USDT, WBTC, 1_000_000 * 10 ** 6, 50 * 10 ** 8);

        // WETH/WBTC
        _addLiquidity(WETH, WBTC, 100 * 10 ** 18, 5 * 10 ** 8);

        console.log("\n=== Liquidity added ===");

        // 3. Perform swaps
        console.log("\n=== Executing swaps ===");

        // USDC -> WETH
        _swap(USDC, WETH, 1000 * 10 ** 6);

        // WETH -> USDC
        _swap(WETH, USDC, 1 * 10 ** 18);

        // USDT -> WETH
        _swap(USDT, WETH, 1000 * 10 ** 6);

        vm.stopBroadcast();

        console.log("\n=== Complete! ===");
    }

    function _addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) internal {
        address pair = IBiteSwapV2Factory(FACTORY).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IBiteSwapV2Factory(FACTORY).createPair(tokenA, tokenB);
        }

        (,, uint256 liquidity) =
            IBiteSwapV2Router(ROUTER).addLiquidity(tokenA, tokenB, amountA, amountB, 0, 0, RECIPIENT);

        console.log("Added liquidity for pair");
        console.logAddress(tokenA);
        console.logAddress(tokenB);
        console.logUint(liquidity);
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn) internal {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256 amountOut = IBiteSwapV2Router(ROUTER).swapExactTokensForTokens(amountIn, 0, path, RECIPIENT);

        console.log("Swapped:");
        console.logUint(amountIn);
        console.logAddress(tokenIn);
        console.logUint(amountOut);
        console.logAddress(tokenOut);
    }

    function _tokenSymbol(address token) internal view returns (string memory) {
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("symbol()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (string));
        }
        return "?";
    }

    function _decimals(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 18;
    }
}
