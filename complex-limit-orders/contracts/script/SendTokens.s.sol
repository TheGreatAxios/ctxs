pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MockToken.sol";

/// @notice Send Mock ERC-20 tokens to a recipient
contract SendTokens is Script {
    // Token addresses from latest deployment
    address constant USDC = 0xD66368D1881091B44356a18A29d4529aaEfe1e91;
    address constant USDT = 0x7A881a4E39827e69C552dCa070F4d8DC36bb3E05;
    address constant WETH = 0x1f7fc775E166a9CF7159DA03c993C026064BFc86;
    address constant WBTC = 0xd09aA46aBc7D505E9edF77DF39c2E45d5893dc60;

    function run() external {
        vm.startBroadcast();

        // address recipient = 0x8DfF0b2A3F732c340491C9539998f649cdD36b3A;
        address recipient = 0xcE7E58D645655CB7B573Fa3B161F344e210Dd2c8;

        // Send ERC-20 tokens
        MockToken(USDC).transfer(recipient, 10_000 * 10 ** 6);
        MockToken(USDT).transfer(recipient, 10_000 * 10 ** 6);
        MockToken(WETH).transfer(recipient, 1 * 10 ** 18);
        MockToken(WBTC).transfer(recipient, 0.1 * 10 ** 8);

        // Send 50 ETH native (covers both ETH value + sFUEL gas on SKALE)
        (bool success,) = recipient.call{value: 50 ether}("");
        require(success, "Native transfer failed");

        vm.stopBroadcast();
    }
}
