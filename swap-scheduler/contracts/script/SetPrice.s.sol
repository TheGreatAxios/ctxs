pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/ScheduledSwapBook.sol";

/// @notice Script to set price for a pool (mock oracle)
/// Usage: forge script script/SetPrice.s.sol --sig "run(address,address,uint256)" --rpc-url <url> --account <name> --broadcast
contract SetPrice is Script {
    function run(address scheduler, address pool, uint256 price) external {
        vm.startBroadcast();

        ScheduledSwapBook(payable(scheduler)).setPrice(pool, price);
        console.log("Set price for pool:");
        console.logAddress(pool);
        console.log("Price:");
        console.logUint(price);

        vm.stopBroadcast();
    }
}
