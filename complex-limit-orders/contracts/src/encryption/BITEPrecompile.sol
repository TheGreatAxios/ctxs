pragma solidity 0.8.20;

library BITEPrecompile {
    /// @notice Submit a conditional transaction
    /// @param encryptedArgs Encrypted arguments for CTX
    /// @param plaintextArgs Plaintext arguments for CTX
    /// @param gasLimit Gas limit for the CTX
    /// @return ctxSender Address that must be funded with ETH for gas (first 20 bytes of result)
    /// @return success Whether the submission succeeded
    function submitCTX(bytes[] memory encryptedArgs, bytes[] memory plaintextArgs, uint256 gasLimit)
        internal
        returns (address ctxSender, bool success)
    {
        bytes memory ctxData = abi.encode(encryptedArgs, plaintextArgs);
        bytes memory input = abi.encode(gasLimit, ctxData);

        (bool callSuccess, bytes memory result) = address(0x1B).staticcall(input);
        if (!callSuccess || result.length < 20) {
            return (address(0), false);
        }

        ctxSender = address(bytes20(result));
        success = true;
    }
}
