pragma solidity 0.8.24;

library BITEPrecompile {
    /// @notice Submit a conditional transaction
    /// @param encryptedArgs Encrypted arguments for CTX
    /// @param plaintextArgs Plaintext arguments for CTX
    /// @return ctxSender Address that must be funded with ETH for gas (first 20 bytes of result)
    function submitCTX(bytes[] memory encryptedArgs, bytes[] memory plaintextArgs)
        internal
        returns (address ctxSender)
    {
        bytes memory input = abi.encode(encryptedArgs, plaintextArgs);

        (bool success, bytes memory result) = address(0x1B).staticcall(input);
        require(success, "BITE: submitCTX failed");

        ctxSender = address(bytes20(result));
    }
}
