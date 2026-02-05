pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/interfaces/IBiteSwapV2Factory.sol";
import "../src/amm/interfaces/IBiteSwapV2Router.sol";
import "../src/amm/interfaces/IBiteSwapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreatePairs is Script {
    // Deployed contract addresses (Feb 2025) - checksummed
    address constant FACTORY = 0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71;
    address constant ROUTER = 0xfDcD856d4c3Ee3c27D63a1FCDC0597226DBe91d5;
    address constant LIMIT_ORDER_BOOK = 0x8d413a5e31F311d1f85be177D658cF468325C88c;

    // Token addresses (deployed MockTokens) - checksummed
    address constant USDC = 0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE;
    address constant USDT = 0xE242b5c5D390b5777437423e9C7B13e56a7dFA59;
    address constant WETH = 0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc;
    address constant WBTC = 0x12A04EAa0e41EaDBE1b12693df3ac82cb7b81375;

    // Pairs already created during deployment - checksummed
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;
    address constant USDC_WBTC_PAIR = 0xE93B97B1022Be5ea1f0e00E2bC33F6BA8E8009c4;
    address constant USDT_WETH_PAIR = 0x0752b5D83E31604EBE369cD6EBa82e0F728De739;
    address constant USDT_WBTC_PAIR = 0xB112D461eC20e5df033E090fe47d653DbdF39273;
    address constant WETH_WBTC_PAIR = 0x5eDFE72563D93A6A150FA5788FAd4F4AEC8F6D92;

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
