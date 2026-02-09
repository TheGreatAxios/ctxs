pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/amm/BiteSwapV2Factory.sol";
import "../src/amm/BiteSwapV2Router.sol";
import "../src/limitorder/ConfidentialLimitOrderBook.sol";
import "../src/generic/ConditionalTransactionBook.sol";
import "../src/MockToken.sol";
import "../src/conditions/impl/AMMPriceConditionChecker.sol";
import "../src/actions/impl/AMMSwapActionExecutor.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Full deployment script: Tokens, AMM, Limit Orders, Generic Book
contract DeployEverything is Script {
    // ═════════════════════════════════════════════════════════════════════════
    // Structs
    // ═════════════════════════════════════════════════════════════════════════
    struct DeploymentConfig {
        address usdc;
        address usdt;
        address weth;
        address wbtc;
        address factory;
        address router;
        address limitOrderBook;
        address genericBook;
        address priceChecker;
        address swapExecutor;
    }

    struct LiquidityConfig {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error TransferFailed();

    // ═════════════════════════════════════════════════════════════════════════
    // Run
    // ═════════════════════════════════════════════════════════════════════════
    function run() external returns (DeploymentConfig memory) {
        vm.startBroadcast();

        DeploymentConfig memory config;

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 1: Deploy Tokens
        // ═════════════════════════════════════════════════════════════════════════
        console.log("=== Phase 1: Deploying Tokens ===");

        config.usdc = address(new MockToken("USD Coin", "USDC", true, 6));
        config.usdt = address(new MockToken("Tether USD", "USDT", true, 6));
        config.weth = address(new MockToken("Wrapped Ether", "WETH", true, 18));
        config.wbtc = address(new MockToken("Wrapped BTC", "WBTC", true, 8));

        console.log("USDC:", config.usdc);
        console.log("USDT:", config.usdt);
        console.log("WETH:", config.weth);
        console.log("WBTC:", config.wbtc);

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 2: Mint Tokens to Deployer and Test Accounts
        // ═════════════════════════════════════════════════════════════════════════
        console.log("\n=== Phase 2: Minting Tokens ===");

        address[] memory recipients = new address[](4);
        recipients[0] = msg.sender;
        recipients[1] = 0x8DfF0b2A3F732c340491C9539998f649cdD36b3A;
        recipients[2] = 0x2c20Ef3fc0248FCA2DC57bcb202F2CAe504A9A66;
        recipients[3] = 0xC1789D08713C6aBaeF63db72607a95f4A5D14058; // bite-deployer

        // Mint to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            // Increased mint amounts for higher liquidity per pool (80M TVL per pool)
            MockToken(config.usdc).mint(recipients[i], 200_000_000 * 10 ** 6);  // 200M USDC
            MockToken(config.usdt).mint(recipients[i], 200_000_000 * 10 ** 6);  // 200M USDT
            MockToken(config.weth).mint(recipients[i], 80_000 * 10 ** 18);        // 80K WETH (~240M)
            MockToken(config.wbtc).mint(recipients[i], 2_000 * 10 ** 8);          // 2K WBTC (~200M)

            console.log("Minted tokens to:", recipients[i]);
        }

        console.log("Minted 200M USDC, 200M USDT, 80K WETH, 2K WBTC to each recipient");

        vm.stopBroadcast();

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 3: Deploy AMM Core
        // ═════════════════════════════════════════════════════════════════════════
        vm.startBroadcast();

        console.log("\n=== Phase 3: Deploying AMM Core ===");

        BiteSwapV2Factory factory = new BiteSwapV2Factory();
        BiteSwapV2Router router = new BiteSwapV2Router(factory, config.weth);
        ConfidentialLimitOrderBook limitOrderBook = new ConfidentialLimitOrderBook();

        config.factory = address(factory);
        config.router = address(router);
        config.limitOrderBook = address(limitOrderBook);

        console.log("Factory:", config.factory);
        console.log("Router:", config.router);
        console.log("LimitOrderBook:", config.limitOrderBook);

        vm.stopBroadcast();

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 4: Deploy Generic Book + Checkers/Executors
        // ═════════════════════════════════════════════════════════════════════════
        vm.startBroadcast();

        console.log("\n=== Phase 4: Deploying Generic Book ===");

        ConditionalTransactionBook genericBook = new ConditionalTransactionBook();
        AMMPriceConditionChecker priceChecker = new AMMPriceConditionChecker();
        AMMSwapActionExecutor swapExecutor = new AMMSwapActionExecutor();

        config.genericBook = address(genericBook);
        config.priceChecker = address(priceChecker);
        config.swapExecutor = address(swapExecutor);

        console.log("ConditionalTransactionBook:", config.genericBook);
        console.log("AMMPriceConditionChecker:", config.priceChecker);
        console.log("AMMSwapActionExecutor:", config.swapExecutor);

        // Register checker and executor
        genericBook.registerChecker(config.priceChecker);
        genericBook.registerExecutor(config.swapExecutor);

        console.log("Registered checker and executor");

        vm.stopBroadcast();

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 5: Link Factory with LimitOrderBook
        // ═════════════════════════════════════════════════════════════════════════
        vm.startBroadcast();

        console.log("\n=== Phase 5: Linking Contracts ===");

        limitOrderBook.setFactory(config.factory);
        factory.setLimitOrderBook(config.limitOrderBook);

        console.log("Linked Factory and LimitOrderBook");

        vm.stopBroadcast();

        // ═════════════════════════════════════════════════════════════════════════
        // Phase 6: Create Pairs and Add Liquidity
        // ═════════════════════════════════════════════════════════════════════════
        console.log("\n=== Phase 6: Creating Pairs and Adding Liquidity ===");

        LiquidityConfig[5] memory liquidityConfigs = [
            // USDC/WETH: 40M USDC + ~13,333 WETH = ~80M TVL
            LiquidityConfig(config.usdc, config.weth, 40_000_000 * 10 ** 6, 13_333 * 10 ** 18),
            // USDC/WBTC: 40M USDC + ~400 WBTC = ~80M TVL
            LiquidityConfig(config.usdc, config.wbtc, 40_000_000 * 10 ** 6, 400 * 10 ** 8),
            // USDT/WETH: 40M USDT + ~13,333 WETH = ~80M TVL
            LiquidityConfig(config.usdt, config.weth, 40_000_000 * 10 ** 6, 13_333 * 10 ** 18),
            // USDT/WBTC: 40M USDT + ~400 WBTC = ~80M TVL
            LiquidityConfig(config.usdt, config.wbtc, 40_000_000 * 10 ** 6, 400 * 10 ** 8),
            // WETH/WBTC: ~20K WETH + ~600 WBTC = ~120M TVL
            LiquidityConfig(config.weth, config.wbtc, 20_000 * 10 ** 18, 600 * 10 ** 8)
        ];

        for (uint256 i = 0; i < liquidityConfigs.length; ++i) {
            vm.startBroadcast();
            _createPairAndAddLiquidity(config.factory, liquidityConfigs[i]);
            vm.stopBroadcast();
        }

        console.log("\n=== Deployment Complete ===");

        return config;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Internal Functions
    // ═════════════════════════════════════════════════════════════════════════
    function _createPairAndAddLiquidity(address factory, LiquidityConfig memory config) internal {
        // Create pair
        address pair = IBiteSwapV2Factory(factory).createPair(config.token0, config.token1);

        console.log("Created pair:", pair);

        // Transfer tokens to pair
        IERC20(config.token0).transfer(pair, config.amount0);
        IERC20(config.token1).transfer(pair, config.amount1);

        // Mint LP tokens
        BiteSwapV2Pair(pair).mint(msg.sender);

        uint256 lpBalance = BiteSwapV2Pair(pair).balanceOf(msg.sender);
        console.log("LP tokens minted:", lpBalance);

        // Log reserves
        (uint112 reserve0, uint112 reserve1,) = BiteSwapV2Pair(pair).getReserves();
        console.log("Reserve0:", reserve0);
        console.log("Reserve1:", reserve1);
    }
}
