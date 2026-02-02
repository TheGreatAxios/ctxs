pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Factory.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../src/amm/BiteSwapV2Pair.sol";
import "../src/MockToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    function run() external returns (address factory, address router, address lob, address usdc, address usdt, address weth, address wbtc) {
        vm.startBroadcast();

        // Deploy tokens
        usdc = address(new MockToken("USD Coin", "USDC", true, 6));
        usdt = address(new MockToken("Tether USD", "USDT", true, 6));
        weth = address(new MockToken("Wrapped Ether", "WETH", true, 18));
        wbtc = address(new MockToken("Wrapped BTC", "WBTC", true, 8));

        MockToken(usdc).mint(msg.sender, 100_000_000 * 10 ** 6);
        MockToken(usdt).mint(msg.sender, 100_000_000 * 10 ** 6);
        MockToken(weth).mint(msg.sender, 1_000_000 * 10 ** 18);
        MockToken(wbtc).mint(msg.sender, 100_000 * 10 ** 8);

        // Deploy AMM
        BiteSwapV2Factory _factory = new BiteSwapV2Factory();
        BiteSwapV2Router _router = new BiteSwapV2Router(_factory, weth);
        ConfidentialLimitOrderBook _lob = new ConfidentialLimitOrderBook();

        factory = address(_factory);
        router = address(_router);
        lob = address(_lob);

        vm.stopBroadcast();

        vm.startBroadcast();
        _lob.setFactory(factory);
        _factory.setLimitOrderBook(lob);
        vm.stopBroadcast();

        vm.startBroadcast();
        _addPairAndLiquidity(factory, usdc, weth, 30_000_000 * 10 ** 6, 10_000 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast();
        _addPairAndLiquidity(factory, usdc, wbtc, 30_000_000 * 10 ** 6, 385 * 10 ** 8);
        vm.stopBroadcast();

        vm.startBroadcast();
        _addPairAndLiquidity(factory, usdt, weth, 30_000_000 * 10 ** 6, 10_000 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast();
        _addPairAndLiquidity(factory, usdt, wbtc, 30_000_000 * 10 ** 6, 385 * 10 ** 8);
        vm.stopBroadcast();

        vm.startBroadcast();
        _addPairAndLiquidity(factory, weth, wbtc, 5_000 * 10 ** 18, 192 * 10 ** 8);
        vm.stopBroadcast();
    }

    function _addPairAndLiquidity(address factory, address t0, address t1, uint256 a0, uint256 a1) internal {
        address pair = IBiteSwapV2Factory(factory).createPair(t0, t1);
        IERC20(t0).transfer(pair, a0);
        IERC20(t1).transfer(pair, a1);
        BiteSwapV2Pair(pair).mint(msg.sender);
    }
}
