// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/RockPaperScissors.sol";
import "../src/MockSKL.sol";

contract Deploy is Script {
    struct DeploymentInfo {
        address token;
        address game;
        uint256 chainId;
    }

    function run() external returns (DeploymentInfo memory) {
        // Uses --account flag from CLI (cast wallet)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock SKL token first
        MockSKL token = new MockSKL();

        // Deploy game contract with fee recipient set to deployer
        address feeRecipient = msg.sender;
        RockPaperScissors game = new RockPaperScissors(feeRecipient);

        vm.stopBroadcast();

        DeploymentInfo memory info = DeploymentInfo({
            token: address(token),
            game: address(game),
            chainId: block.chainid
        });

        console.log("MockSKL deployed at:", address(token));
        console.log("RockPaperScissors deployed at:", address(game));
        console.log("Deployer (fee recipient):", feeRecipient);
        console.log("Network:", block.chainid);

        // Export to JSON for frontend to use
        vm.serializeUint("deployment.json", vm.toString(address(token)), "token");
        vm.serializeUint("deployment.json", vm.toString(address(game)), "game");
        vm.serializeUint("deployment.json", vm.toString(block.chainid), "chainId");

        return info;
    }
}
