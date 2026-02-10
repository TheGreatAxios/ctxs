pragma solidity 0.8.20;

library BITEPrecompile {
    // SKALE BITE V2 Precompile Addresses
    address internal constant SUBMIT_CTX = address(0x1B);
    address internal constant ENCRYPT_TE = address(0x1C);
    address internal constant ENCRYPT_ECIES = address(0x1D);

    /// @notice Submit a conditional transaction
    /// @param encryptedArgs Encrypted arguments for CTX
    /// @param plaintextArgs Plaintext arguments for CTX
    /// @param gasLimit Gas limit for the CTX
    /// @return ctxSender Address that must be funded with ETH for gas (first 20 bytes of result)
    function submitCTX(bytes[] memory encryptedArgs, bytes[] memory plaintextArgs, uint256 gasLimit)
        internal
        returns (address ctxSender)
    {
        bytes memory ctxData = abi.encode(encryptedArgs, plaintextArgs);
        bytes memory input = abi.encode(gasLimit, ctxData);

        (bool success, bytes memory result) = SUBMIT_CTX.staticcall(input);
        require(success, "BITE: submitCTX failed");

        ctxSender = address(bytes20(result));
    }

    /// @notice Encrypt data using threshold encryption (BLS)
    /// @param data Data to encrypt (max 64KB)
    /// @return ciphertext Encrypted data
    function encryptTE(bytes memory data) internal view returns (bytes memory ciphertext) {
        (bool success, bytes memory result) = ENCRYPT_TE.staticcall(data);
        require(success, "BITE: encryptTE failed");
        ciphertext = result;
    }
}
