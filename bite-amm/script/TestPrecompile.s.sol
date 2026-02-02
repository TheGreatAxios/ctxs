pragma solidity 0.8.24;

import "forge-std/Script.sol";

contract TestPrecompile is Script {
    address constant SUBMIT_CTX = 0x0000000000000000000000000000000000000014;

    function run() external view {
        console.log("=== Testing BITE submitCTX Precompile ===");
        console.log("Using: address(0x1B).staticcall()");

        // Test data
        bytes[] memory encryptedArgs = new bytes[](2);
        encryptedArgs[0] = abi.encode(12345);  // mock target price
        encryptedArgs[1] = abi.encode(67890);  // mock amount

        bytes[] memory plaintextArgs = new bytes[](4);
        plaintextArgs[0] = abi.encode(address(0x123));  // mock pool
        plaintextArgs[1] = abi.encode(true);           // mock direction
        plaintextArgs[2] = abi.encode(msg.sender);      // mock maker
        plaintextArgs[3] = abi.encode(uint256(1));      // mock nonce

        // Build input: just abi.encode(encryptedArgs, plaintextArgs)
        bytes memory input = abi.encode(encryptedArgs, plaintextArgs);

        console.log("\nInput length:", input.length);
        console.log("Input (first 64 bytes):");
        console.logBytes(input);

        // Try staticcall with address(0x1B)
        (bool success, bytes memory result) = address(0x1B).staticcall(input);

        console.log("\n=== Result ===");
        console.log("Success:", success);
        console.log("Result length:", result.length);

        if (result.length > 0) {
            console.log("Result:");
            console.logBytes(result);

            if (result.length >= 20) {
                address ctxSender = address(bytes20(result));
                console.log("CTX Sender:", ctxSender);
            }
        } else {
            console.log("Empty result - precompile may not be working!");
        }

        if (!success) {
            console.log("\nStaticcall FAILED - precompile not responding correctly");
        }
    }
}
