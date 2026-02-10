// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title IBITE
 * @notice Interface for BITE (Blockchain Integrated Threshold Encryption) precompiles on SKALE
 */
interface IBITE {
    /**
     * @notice Submit a Conditional Transaction (CTX)
     * @param gasLimit The gas limit for the CTX execution
     * @param data The data to be decrypted and executed
     * @return ctxSender The address of the CTX wallet that will execute the transaction
     */
    function submitCTX(uint256 gasLimit, bytes calldata data) external returns (address);
    
    /**
     * @notice Encrypt data using Threshold Encryption (TE)
     * @param data The data to encrypt (max 64KB)
     * @return ciphertext The encrypted ciphertext
     */
    function encryptTE(bytes calldata data) external view returns (bytes memory);
    
    /**
     * @notice Encrypt data using ECIES with secp256k1 public key
     * @param data The data to encrypt (max 64KB)
     * @param pubKeyX The X coordinate of the public key
     * @param pubKeyY The Y coordinate of the public key
     * @return ciphertext The encrypted ciphertext with IV + ephemeral key
     */
    function encryptECIES(
        bytes calldata data,
        bytes32 pubKeyX,
        bytes32 pubKeyY
    ) external view returns (bytes memory);
}

/**
 * @title BITEAddresses
 * @notice Precompile addresses for BITE on SKALE
 */
library BITEAddresses {
    address public constant SUBMIT_CTX = address(0x1b);
    address public constant ENCRYPT_TE = address(0x1c);
    address public constant ENCRYPT_ECIES = address(0x1d);
}