// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/RockPaperScissors.sol";

contract Deploy is Script {
    function run() external {
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        
        // Uses --account flag from CLI (cast wallet)
        vm.startBroadcast();

        RockPaperScissors game = new RockPaperScissors(feeRecipient);

        vm.stopBroadcast();

        console.log("RockPaperScissors deployed at:", address(game));
        console.log("Network:", block.chainid);
    }
}