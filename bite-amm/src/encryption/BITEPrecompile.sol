pragma solidity 0.8.24;

library BITEPrecompile {
    /// @notice Precompile address for submitting CTXs
    /// @dev Input: abi.encode(randomNumber, abi.encode(encryptedArgs, plaintextArgs)) -> Output: address ctxSender (20 bytes)
    address internal constant SUBMIT_CTX = 0x0000000000000000000000000000000000000014;

    /// @notice Submit a conditional transaction
    /// @param encryptedArgs Encrypted arguments for CTX
    /// @param plaintextArgs Plaintext arguments for CTX
    /// @return ctxSender Address that must be funded with ETH for gas (first 20 bytes of result)
    function submitCTX(bytes[] memory encryptedArgs, bytes[] memory plaintextArgs)
        internal
        returns (address ctxSender)
    {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.number))) % 2500000 + 1000000;
        bytes memory data = abi.encode(encryptedArgs, plaintextArgs);
        bytes memory input = abi.encode(randomNumber, data);

        (bool success, bytes memory result) = SUBMIT_CTX.staticcall(input);
        require(success, "BITE: submitCTX failed");

        ctxSender = address(bytes20(result));
    }
}
