pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/ScheduledSwapBook.sol";

/// @notice Script to check and trigger scheduled swaps for a pool
/// Usage: forge script script/CheckSwaps.s.sol --sig "run(address,address)" --rpc-url <url> --account <name> --broadcast
contract CheckSwaps is Script {
    function run(address scheduler, address pool) external {
        vm.startBroadcast();

        // Get active swap count before
        uint256 activeCountBefore = ScheduledSwapBook(payable(scheduler)).getActiveSwapCount(pool);
        console.log("Active swaps before:");
        console.logUint(activeCountBefore);

        // Check swaps (triggers CTX submission)
        ScheduledSwapBook(payable(scheduler)).checkSwaps(pool);
        console.log("Checked swaps for pool:");
        console.logAddress(pool);

        vm.stopBroadcast();
    }
}
