pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/NostradamusRegistry.sol";

contract Deploy is Script {
    NostradamusRegistry public registry;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        registry = new NostradamusRegistry();

        vm.stopBroadcast();

        console.log("NostradamusRegistry deployed at:", address(registry));
    }
}
