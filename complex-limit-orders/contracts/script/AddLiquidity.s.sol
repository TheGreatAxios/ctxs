pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Add liquidity to all pools with low liquidity
 *
 * Usage:
 *   forge script script/AddLiquidity.s.sol \
 *     --rpc-url https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit \
 *     --account <ACCOUNT_NAME> \
 *     --broadcast \
 *     --sender <YOUR_ADDRESS>
 *
 * Or with private key (not recommended):
 *   forge script script/AddLiquidity.s.sol \
 *     --rpc-url https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit \
 *     --private-key <PRIVATE_KEY> \
 *     --broadcast
 */
contract AddLiquidity is Script {
    // SKALE Testnet - DeployEverything addresses
    address constant FACTORY = 0x1066933816E83575A7a79173e55Af62AF4B0E684;
    address constant ROUTER = 0x38d55749A1B2c34A9161ce644F0530329695548d;

    // Tokens
    address constant USDC = 0xd541EE6977722B329bc15E668C3501473Dd1FEbc;
    address constant USDT = 0x5D53C8E216cC91B0f0A20FB2f597317276491cD4;
    address constant WBTC = 0x9C520Fd0CcFFe4B634a7cD4F93a407dC021B5B69;
    address constant WETH = 0xad67453Ce29dd7fEbE30f882E17CcFfd9Ed75F2E;

    // Minimum liquidity threshold (in USD value) for a pool to be considered "well-funded"
    uint256 constant MIN_LIQUIDITY_THRESHOLD = 100_000 * 10 ** 6; // $100k worth of tokens
    // Target TVL to reach
    uint256 constant TARGET_TVL = 500_000 * 10 ** 6; // $500k worth of tokens

    struct PoolInfo {
        address pair;
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 tvlUsd;
        bool needsLiquidity;
        string symbol0;
        string symbol1;
    }

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;
        console.log(string(abi.encodePacked("Deployer address:", vm.toString(deployer))));

        // Approve router for all tokens
        console.log("\n=== Approving Router ===");
        _approveToken(USDC, "USDC");
        _approveToken(USDT, "USDT");
        _approveToken(WBTC, "WBTC");
        _approveToken(WETH, "WETH");

        // Get all pairs from factory
        address[] memory pairs = _getAllPairs();
        console.log(string(abi.encodePacked("\n=== Found ", vm.toString(pairs.length), " pairs ===")));

        // Check each pool's liquidity
        PoolInfo[] memory poolInfos = new PoolInfo[](pairs.length);
        uint256 needsLiquidityCount = 0;

        console.log("\n=== Pool Liquidity Check ===");
        for (uint256 i = 0; i < pairs.length; i++) {
            poolInfos[i] = _checkPoolLiquidity(pairs[i]);

            string memory symbol0 = poolInfos[i].symbol0;
            string memory symbol1 = poolInfos[i].symbol1;
            string memory status = poolInfos[i].needsLiquidity ? "NEEDS LIQUIDITY" : "OK";

            string memory logStr = string(abi.encodePacked(
                "  ", symbol0, "/", symbol1,
                " | TVL: $", _formatUsd(poolInfos[i].tvlUsd),
                " | ", status
            ));
            console.log(logStr);

            if (poolInfos[i].needsLiquidity) {
                needsLiquidityCount++;
            }
        }

        console.log(string(abi.encodePacked("\n=== Pools needing liquidity: ", vm.toString(needsLiquidityCount), " ===")));

        // Add liquidity to pools that need it
        for (uint256 i = 0; i < poolInfos.length; i++) {
            if (poolInfos[i].needsLiquidity) {
                _addLiquidityToPool(poolInfos[i]);
            }
        }

        console.log("\n=== Done! ===");

        vm.stopBroadcast();
    }

    function _approveToken(address token, string memory symbol) internal {
        uint256 allowance = IERC20(token).allowance(msg.sender, ROUTER);
        if (allowance < type(uint256).max / 2) {
            IERC20(token).approve(ROUTER, type(uint256).max);
            console.log(string(abi.encodePacked("  Approved ", symbol)));
        } else {
            console.log(string(abi.encodePacked("  ", symbol, " already approved")));
        }
    }

    function _getAllPairs() internal pure returns (address[] memory) {
        // Known pairs from DeployEverything
        address[] memory pairs = new address[](5);
        pairs[0] = 0x55079Ef8c5A4dFCf6575452D0B7e33B5076099a2; // USDC/WETH
        pairs[1] = 0xC9935D1Ab54Eb157B66484baA47E866C9F65A871; // USDC/WBTC
        pairs[2] = 0xBF399Ac451e91c13aFD73b8dD8A1Af18252f67C4; // USDT/WETH
        pairs[3] = 0x1B33C331cAa7aa2f061713200ac34B8a0106b896; // USDT/WBTC
        pairs[4] = 0x94d9757E7B1F9f62D259A1b637CBCCFF9142DaF3; // WETH/WBTC
        return pairs;
    }

    function _checkPoolLiquidity(address pair) internal view returns (PoolInfo memory) {
        IBiteSwapV2Pair pairContract = IBiteSwapV2Pair(pair);
        (uint112 reserve0, uint112 reserve1,) = pairContract.getReserves();
        address token0 = pairContract.token0();
        address token1 = pairContract.token1();

        // Calculate TVL (approximate using token prices)
        // Assuming: USDC/USDT = $1, WETH = $3000, WBTC = $100,000
        uint256 tvlUsd = _calculateTVL(token0, token1, reserve0, reserve1);

        return PoolInfo({
            pair: pair,
            token0: token0,
            token1: token1,
            reserve0: reserve0,
            reserve1: reserve1,
            tvlUsd: tvlUsd,
            needsLiquidity: tvlUsd < MIN_LIQUIDITY_THRESHOLD,
            symbol0: _getSymbol(token0),
            symbol1: _getSymbol(token1)
        });
    }

    function _calculateTVL(
        address token0,
        address token1,
        uint256 reserve0,
        uint256 reserve1
    ) internal pure returns (uint256) {
        uint256 value0 = _getTokenValue(token0, reserve0);
        uint256 value1 = _getTokenValue(token1, reserve1);
        return value0 + value1;
    }

    function _getTokenValue(address token, uint256 amount) internal pure returns (uint256) {
        // Approximate USD values (6 decimals)
        if (token == USDC || token == USDT) {
            return amount; // Already 6 decimals
        } else if (token == WETH) { // ~$3000
            return (amount * 3000 * 10 ** 6) / 10 ** 18;
        } else if (token == WBTC) { // ~$100k
            return (amount * 100_000 * 10 ** 6) / 10 ** 8;
        }
        return 0;
    }

    function _getSymbol(address token) internal pure returns (string memory) {
        if (token == USDC) return "USDC";
        if (token == USDT) return "USDT";
        if (token == WBTC) return "WBTC";
        if (token == WETH) return "WETH";
        return "???";
    }

    function _formatUsd(uint256 amount) internal pure returns (string memory) {
        uint256 dollars = amount / 10 ** 6;
        if (dollars >= 1_000_000) {
            return string(abi.encodePacked(
                vm.toString(dollars / 1_000_000),
                ".",
                vm.toString((dollars % 1_000_000) / 10_000),
                "M"
            ));
        } else if (dollars >= 1_000) {
            return string(abi.encodePacked(
                vm.toString(dollars / 1_000),
                ".",
                vm.toString((dollars % 1_000) / 10),
                "K"
            ));
        }
        return vm.toString(dollars);
    }

    function _addLiquidityToPool(PoolInfo memory pool) internal {
        console.log(string(abi.encodePacked("\n=== Adding liquidity to ", pool.symbol0, "/", pool.symbol1, " ===")));

        // Calculate token amounts to add (aim for TARGET_TVL)
        uint256 currentTVL = pool.tvlUsd;
        uint256 liquidityToAdd = TARGET_TVL > currentTVL ? TARGET_TVL - currentTVL : TARGET_TVL / 2;

        // Calculate amounts based on current reserves ratio
        uint256 amount0;
        uint256 amount1;

        if (pool.reserve0 == 0 || pool.reserve1 == 0) {
            // Empty pool - add 50/50 by value
            uint256 halfValue = liquidityToAdd / 2;
            amount0 = _usdToTokenAmount(pool.token0, halfValue);
            amount1 = _usdToTokenAmount(pool.token1, halfValue);
            console.log("  Empty pool - adding 50/50 by value");
        } else {
            // Add proportionally to existing reserves
            uint256 totalValue = _getTokenValue(pool.token0, pool.reserve0) +
                               _getTokenValue(pool.token1, pool.reserve1);
            uint256 ratio0 = (_getTokenValue(pool.token0, pool.reserve0) * 100) / totalValue;
            uint256 ratio1 = (_getTokenValue(pool.token1, pool.reserve1) * 100) / totalValue;

            amount0 = _usdToTokenAmount(pool.token0, (liquidityToAdd * ratio0) / 100);
            amount1 = _usdToTokenAmount(pool.token1, (liquidityToAdd * ratio1) / 100);

            console.log(string(abi.encodePacked("  Ratio0: ", vm.toString(ratio0), "% | Ratio1: ", vm.toString(ratio1), "%")));
        }

        // Minimum amounts (allow 0.5% slippage)
        uint256 amount0Min = (amount0 * 995) / 1000;
        uint256 amount1Min = (amount1 * 995) / 1000;

        console.log(string(abi.encodePacked("  Amount0: ", vm.toString(amount0), " ", pool.symbol0)));
        console.log(string(abi.encodePacked("  Amount1: ", vm.toString(amount1), " ", pool.symbol1)));

        IBiteSwapV2Router(ROUTER).addLiquidity(
            pool.token0,
            pool.token1,
            amount0,
            amount1,
            amount0Min,
            amount1Min,
            msg.sender
        );

        console.log("  Liquidity added!");
    }

    function _usdToTokenAmount(address token, uint256 usdAmount) internal pure returns (uint256) {
        if (token == USDC || token == USDT) {
            return usdAmount; // 6 decimals
        } else if (token == WETH) { // 18 decimals, ~$3000
            return (usdAmount * 10 ** 18) / (3000 * 10 ** 6);
        } else if (token == WBTC) { // 8 decimals, ~$100k
            return (usdAmount * 10 ** 8) / (100_000 * 10 ** 6);
        }
        return 0;
    }
}
