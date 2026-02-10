pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/LiarsTable.sol";

contract Deploy is Script {
    function run() external returns (address token, address table) {
        vm.startBroadcast();

        // Deploy MockERC20 token
        MockERC20 tokenContract = new MockERC20();
        token = address(tokenContract);
        console.log("MockERC20 deployed at:", token);

        // Deploy LiarsTable with token address
        LiarsTable tableContract = new LiarsTable(token);
        table = address(tableContract);
        console.log("LiarsTable deployed at:", table);

        vm.stopBroadcast();
    }
}
