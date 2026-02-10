// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Rocket.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        RocketGame rocket = new RocketGame();
        
        console.log("RocketGame deployed at:", address(rocket));
        
        vm.stopBroadcast();
    }
}