pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Factory.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../src/amm/BiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    address constant USDC = 0xC8EEde488d7152CED970D9e9621D9330b64Cfd24;
    address constant USDT = 0x7433ddb971F6a29e24bac69E2d86396201A7aa78;
    address constant WETH = 0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab;
    address constant WBTC = 0x09C6e0Fe49080e10DF7db8A0c8d64660C4d55D86;

    function run() external returns (address factory, address router, address lob) {
        vm.startBroadcast();

        // Deploy contracts
        BiteSwapV2Factory _factory = new BiteSwapV2Factory();
        BiteSwapV2Router _router = new BiteSwapV2Router(_factory, WETH);
        ConfidentialLimitOrderBook _lob = new ConfidentialLimitOrderBook();

        // Configure
        _lob.setFactory(address(_factory));
        _factory.setLimitOrderBook(address(_lob));

        // Create pairs
        address usdcWeth = _factory.createPair(USDC, WETH);
        address usdcWbtc = _factory.createPair(USDC, WBTC);
        address usdtWeth = _factory.createPair(USDT, WETH);
        address usdtWbtc = _factory.createPair(USDT, WBTC);
        address wethWbtc = _factory.createPair(WETH, WBTC);

        // Add liquidity
        _addLiquidity(USDC, WETH, usdcWeth, 1_000_000 * 10 ** 6, 500 * 10 ** 18);
        _addLiquidity(USDC, WBTC, usdcWbtc, 1_000_000 * 10 ** 6, 50 * 10 ** 8);
        _addLiquidity(USDT, WETH, usdtWeth, 1_000_000 * 10 ** 6, 500 * 10 ** 18);
        _addLiquidity(USDT, WBTC, usdtWbtc, 1_000_000 * 10 ** 6, 50 * 10 ** 8);
        _addLiquidity(WETH, WBTC, wethWbtc, 100 * 10 ** 18, 5 * 10 ** 8);

        vm.stopBroadcast();

        factory = address(_factory);
        router = address(_router);
        lob = address(_lob);

        console.log("Factory:", factory);
        console.log("Router:", router);
        console.log("LOB:", lob);
        console.log("USDC/WETH:", usdcWeth);
        console.log("USDC/WBTC:", usdcWbtc);
        console.log("USDT/WETH:", usdtWeth);
        console.log("USDT/WBTC:", usdtWbtc);
        console.log("WETH/WBTC:", wethWbtc);
    }

    function _addLiquidity(address token0, address token1, address pair, uint256 amount0, uint256 amount1) internal {
        IERC20(token0).transfer(pair, amount0);
        IERC20(token1).transfer(pair, amount1);
        BiteSwapV2Pair(pair).mint(msg.sender);
    }
}
