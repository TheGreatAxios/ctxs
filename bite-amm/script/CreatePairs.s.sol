pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreatePairs is Script {
    // Deployed contract addresses from frontend config
    address constant FACTORY = 0x6ebE89B1d64928e822a7b6b6eACe28A7387d279b;
    address constant ROUTER = 0x4295afa9bc0643c73ce760C9b207E6D808D8D555;

    // Token addresses from frontend config
    address constant USDC = 0xe2ECa2C7162CD8447595f40b5b4684A8Ec7900f9;
    address constant USDT = 0x5A4A93dC98025A25c4c01A3b7f56161683da4855;
    address constant WETH = 0x8FE402e969e751296B4D948f20333BDe21D05878;
    address constant WBTC = 0xaCC40e0CA34844aBA5cC9D861459851BbC399693;

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;

        // Mint tokens to deployer (assuming MockToken with mint function)
        console.log("=== Minting tokens to deployer ===");
        _mintIfPossible(USDC, deployer, 100_000_000 * 1e6);
        _mintIfPossible(USDT, deployer, 100_000_000 * 1e6);
        _mintIfPossible(WETH, deployer, 1_000_000 * 1e18);
        _mintIfPossible(WBTC, deployer, 100_000 * 1e8);

        // Approve router
        console.log("\n=== Approving router ===");
        IERC20(USDC).approve(ROUTER, type(uint256).max);
        IERC20(USDT).approve(ROUTER, type(uint256).max);
        IERC20(WETH).approve(ROUTER, type(uint256).max);
        IERC20(WBTC).approve(ROUTER, type(uint256).max);

        // Create pairs and add liquidity
        console.log("\n=== Creating pairs and adding liquidity ===");

        // USDC/WETH
        _addLiquidity(USDC, WETH, 30_000_000 * 1e6, 10_000 * 1e18);

        // USDC/WBTC
        _addLiquidity(USDC, WBTC, 30_000_000 * 1e6, 385 * 1e8);

        // USDT/WETH
        _addLiquidity(USDT, WETH, 30_000_000 * 1e6, 10_000 * 1e18);

        // USDT/WBTC
        _addLiquidity(USDT, WBTC, 30_000_000 * 1e6, 385 * 1e8);

        // WETH/WBTC
        _addLiquidity(WETH, WBTC, 5_000 * 1e18, 192 * 1e8);

        console.log("\n=== Complete! ===");

        vm.stopBroadcast();
    }

    function _mintIfPossible(address token, address to, uint256 amount) internal {
        // Try to call mint if it's a MockToken
        (bool success, ) = token.call(
            abi.encodeWithSignature("mint(address,uint256)", to, amount)
        );
        if (success) {
            console.log("Minted to deployer:");
            console.logAddress(token);
        } else {
            console.log("Token not mintable (may already have supply):");
            console.logAddress(token);
        }
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) internal returns (address pair, uint256 liquidity) {
        // Check if pair exists
        pair = IBiteSwapV2Factory(FACTORY).getPair(tokenA, tokenB);

        if (pair == address(0)) {
            // Create new pair
            pair = IBiteSwapV2Factory(FACTORY).createPair(tokenA, tokenB);
            console.log("Created pair:");
            console.logAddress(pair);
        } else {
            console.log("Pair already exists:");
            console.logAddress(pair);
        }

        // Add liquidity
        (, , liquidity) = IBiteSwapV2Router(ROUTER).addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            0,
            0,
            msg.sender
        );

        console.log("Added liquidity:");
        console.logAddress(tokenA);
        console.logAddress(tokenB);
        console.logUint(liquidity);
    }
}
