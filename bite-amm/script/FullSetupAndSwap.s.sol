pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FullSetupAndSwap is Script {
    address constant FACTORY = 0x40D2A813fCBE548CF2636748e7B2e39FEfBd2cF9;
    address constant ROUTER = 0xF78dFed4F1cf58Dc38D1ceD6a64CD67E209E1d34;

    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant USDT = 0x7433ddb971F6a29e24bac69E2d86396201A7aa78;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant WBTC = 0x09C6e0Fe49080e10DF7db8A0c8d64660C4d55D86;

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
