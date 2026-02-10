pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/NostradamusRegistry.sol";

contract Deploy is Script {
    NostradamusRegistry public registry;

    function run() external {
        vm.startBroadcast();

        registry = new NostradamusRegistry();

        vm.stopBroadcast();

        console.log("NostradamusRegistry deployed at:", address(registry));
    }
}
