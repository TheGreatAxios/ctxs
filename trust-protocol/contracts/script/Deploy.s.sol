pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/TrustGame.sol";

contract Deploy is Script {
    function run() external returns (address token, address game) {
        vm.startBroadcast();

        // Deploy MockERC20 token
        MockERC20 tokenContract = new MockERC20();
        token = address(tokenContract);
        console.log("MockERC20 deployed at:", token);

        // Deploy TrustGame with token address
        TrustGame gameContract = new TrustGame(token);
        game = address(gameContract);
        console.log("TrustGame deployed at:", game);

        vm.stopBroadcast();
    }
}
