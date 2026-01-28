pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/amm/BiteSwapV2Pair.sol";

contract GetInitCodeHash is Script {
    function run() external view {
        bytes memory bytecode = type(BiteSwapV2Pair).creationCode;
        bytes32 hash = keccak256(bytecode);
        console.log("Pair init code hash:");
        console.logBytes32(hash);
    }
}
