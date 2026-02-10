// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Rocket.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        RocketGame rocket = new RocketGame();

        console.log("RocketGame deployed at:", address(rocket));

        vm.stopBroadcast();
    }
}
