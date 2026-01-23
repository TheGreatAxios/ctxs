pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/SushiSwapV2Factory.sol";
import "../src/amm/SushiSwapV2Pair.sol";
import "../src/amm/interfaces/ISushiSwapV2Pair.sol";
import "../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../src/MockToken.sol";

contract DeployScript is Script {
    SushiSwapV2Factory factory;
    ConfidentialLimitOrderBook lob;

    // Tokens
    MockToken usdc;
    MockToken usdt;
    MockToken weth;
    MockToken wbtc;

    // Pairs
    address usdcWethPair;
    address usdcWbtcPair;
    address usdtWethPair;
    address usdtWbtcPair;
    address wethWbtcPair;

    // Liquidity amounts (with proper decimals)
    uint256 constant LIQUIDITY_AMOUNT = 1_000_000 * 10**18; // Base amount for 18 decimals

    function run() external {
        vm.startBroadcast();

        // Deploy tokens with proper decimals
        usdc = new MockToken("USD Coin", "USDC", true, 6);
        usdt = new MockToken("Tether USD", "USDT", true, 6);
        weth = new MockToken("Wrapped Ether", "WETH", true, 18);
        wbtc = new MockToken("Wrapped BTC", "WBTC", true, 8);

        // Deploy factory
        factory = new SushiSwapV2Factory();

        // Deploy limit order book
        lob = new ConfidentialLimitOrderBook();

        // Set factory in LOB
        lob.setFactory(address(factory));

        // Set LOB in factory
        factory.setLimitOrderBook(address(lob));

        // Create all pairs
        usdcWethPair = factory.createPair(address(usdc), address(weth));
        usdcWbtcPair = factory.createPair(address(usdc), address(wbtc));
        usdtWethPair = factory.createPair(address(usdt), address(weth));
        usdtWbtcPair = factory.createPair(address(usdt), address(wbtc));
        wethWbtcPair = factory.createPair(address(weth), address(wbtc));

        // Mint extra tokens to msg.sender for liquidity
        uint256 mintAmount = 100_000_000 * 10**18; // 100M for 18 decimals
        usdc.mint(msg.sender, 100_000_000 * 10**6);
        usdt.mint(msg.sender, 100_000_000 * 10**6);
        weth.mint(msg.sender, mintAmount);
        wbtc.mint(msg.sender, 100_000_000 * 10**8);

        // Add liquidity to USDC/WETH
        _addLiquidity(usdc, weth, usdcWethPair, 1_000_000 * 10**6, 500 * 10**18);
        // Add liquidity to USDC/WBTC
        _addLiquidity(usdc, wbtc, usdcWbtcPair, 1_000_000 * 10**6, 50 * 10**8);
        // Add liquidity to USDT/WETH
        _addLiquidity(usdt, weth, usdtWethPair, 1_000_000 * 10**6, 500 * 10**18);
        // Add liquidity to USDT/WBTC
        _addLiquidity(usdt, wbtc, usdtWbtcPair, 1_000_000 * 10**6, 50 * 10**8);
        // Add liquidity to WETH/WBTC
        _addLiquidity(weth, wbtc, wethWbtcPair, 100 * 10**18, 5 * 10**8);

        vm.stopBroadcast();

        _logDeployment();
    }

    function _addLiquidity(
        MockToken token0,
        MockToken token1,
        address pairAddress,
        uint256 amount0,
        uint256 amount1
    ) internal {
        // Transfer tokens to pair
        token0.transfer(pairAddress, amount0);
        token1.transfer(pairAddress, amount1);

        // Mint LP tokens
        ISushiSwapV2Pair(pairAddress).mint(msg.sender);
    }

    function _logDeployment() internal view {
        console.log("=== Tokens ===");
        console.log("USDC (6 decimals):", address(usdc));
        console.log("USDT (6 decimals):", address(usdt));
        console.log("WETH (18 decimals):", address(weth));
        console.log("WBTC (8 decimals):", address(wbtc));

        console.log("\n=== Core Contracts ===");
        console.log("Factory:", address(factory));
        console.log("LimitOrderBook:", address(lob));

        console.log("\n=== Pairs ===");
        console.log("USDC/WETH:", usdcWethPair);
        console.log("USDC/WBTC:", usdcWbtcPair);
        console.log("USDT/WETH:", usdtWethPair);
        console.log("USDT/WBTC:", usdtWbtcPair);
        console.log("WETH/WBTC:", wethWbtcPair);
    }

}
