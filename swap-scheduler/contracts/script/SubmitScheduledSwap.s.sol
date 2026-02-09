pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/ScheduledSwapBook.sol";
import "../src/encryption/BITEPrecompile.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Script to submit a scheduled swap for testing
/// Usage: forge script script/SubmitScheduledSwap.s.sol --sig "run(address,address,uint256,uint256,bool,uint256)" --rpc-url <url> --account <name> --broadcast
contract SubmitScheduledSwap is Script {
    function run(
        address scheduler,
        address pool,
        address tokenIn,
        uint256 amount,
        uint256 targetPrice,
        bool direction,
        uint256 deadline
    ) external {
        vm.startBroadcast();

        // Approve token transfer
        IERC20(tokenIn).approve(pool, amount);
        console.log("Approved amount:");
        console.logUint(amount);

        // Encrypt the amount using BITE threshold encryption
        bytes memory encryptedAmount = BITEPrecompile.encryptTE(abi.encode(amount));
        bytes memory encryptedTargetPrice = BITEPrecompile.encryptTE(abi.encode(targetPrice));

        // Submit scheduled swap with 0.01 ETH for CTX gas
        ScheduledSwapBook(payable(scheduler)).submitScheduledSwap{value: 0.01 ether}(
            pool,
            encryptedAmount,
            encryptedTargetPrice,
            direction,
            deadline
        );

        console.log("Submitted scheduled swap on pool:");
        console.logAddress(pool);

        vm.stopBroadcast();
    }
}
