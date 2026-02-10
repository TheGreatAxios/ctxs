pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/GridArena.sol";

contract Deploy is Script {
    function run() external returns (address token, address arena) {
        vm.startBroadcast();

        // Deploy MockERC20 token
        MockERC20 tokenContract = new MockERC20();
        token = address(tokenContract);
        console.log("MockERC20 deployed at:", token);

        // Deploy GridArena with token address
        GridArena arenaContract = new GridArena(token);
        arena = address(arenaContract);
        console.log("GridArena deployed at:", arena);

        vm.stopBroadcast();
    }
}
