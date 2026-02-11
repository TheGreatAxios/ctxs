// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/RockPaperScissors.sol";
import "../src/MockSKL.sol";

contract Deploy is Script {
    function run() external {
        // Uses --account <name> flag from CLI (cast wallet)
        vm.startBroadcast();

        // Deploy mock SKL token first
        MockSKL token = new MockSKL();
        console.log("MockSKL deployed at:", address(token));

        // Deploy game contract
        RockPaperScissors game = new RockPaperScissors();
        console.log("RockPaperScissors deployed at:", address(game));
        console.log("Deployer:", msg.sender);
        console.log("Network:", block.chainid);
        console.log("");
        console.log("=== UPDATE FRONTEND ===");
        console.log("TOKEN_ADDRESS[chainId] =", address(token));
        console.log("CONTRACT_ADDRESS[chainId] =", address(game));

        vm.stopBroadcast();
    }
}
