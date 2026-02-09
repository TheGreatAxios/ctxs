pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MockToken.sol";

contract MintTokens is Script {
    function run(address token, address to, uint256 amount) external {
        vm.startBroadcast();
        MockToken(token).mint(to, amount);
        vm.stopBroadcast();

        console.log("Minted", amount, "to", to);
        console.log("New balance:", MockToken(token).balanceOf(to));
    }
}
