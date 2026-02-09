pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Factory.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/amm/BiteSwapV2Pair.sol";
import "../src/ScheduledSwapBook.sol";
import "../src/MockToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployScript is Script {
    function run() external returns (
        address factory,
        address router,
        address scheduler,
        address usdc,
        address usdt,
        address weth,
        address wbtc
    ) {
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
        ScheduledSwapBook _scheduler = new ScheduledSwapBook();

        factory = address(_factory);
        router = address(_router);
        scheduler = address(_scheduler);

        console.log("Factory:", factory);
        console.log("Router:", router);
        console.log("Scheduler:", scheduler);
        console.log("USDC:", usdc);
        console.log("USDT:", usdt);
        console.log("WETH:", weth);
        console.log("WBTC:", wbtc);

        vm.stopBroadcast();

        // Create pairs and add liquidity
        _createPairs(factory, usdc, weth, 30_000_000 * 10 ** 6, 10_000 * 10 ** 18);
        _createPairs(factory, usdc, wbtc, 30_000_000 * 10 ** 6, 385 * 10 ** 8);
        _createPairs(factory, usdt, weth, 30_000_000 * 10 ** 6, 10_000 * 10 ** 18);
        _createPairs(factory, usdt, wbtc, 30_000_000 * 10 ** 6, 385 * 10 ** 8);
        _createPairs(factory, weth, wbtc, 5_000 * 10 ** 18, 192 * 10 ** 8);
    }

    function _createPairs(address factory, address t0, address t1, uint256 a0, uint256 a1) internal {
        vm.startBroadcast();

        address pair = IBiteSwapV2Factory(factory).createPair(t0, t1);
        console.log("Pair:", pair);

        IERC20(t0).transfer(pair, a0);
        IERC20(t1).transfer(pair, a1);

        BiteSwapV2Pair(pair).mint(msg.sender);
        console.log("Liquidity added");

        vm.stopBroadcast();
    }
}
