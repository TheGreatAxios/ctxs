pragma solidity 0.8.24;

library BITEPrecompile {
    /// @notice Precompile address for submitting CTXs
    /// @dev Input: (uint256 gasLimit, bytes data) -> Output: address ctxSender
    address internal constant SUBMIT_CTX = 0x0000000000000000000000000000000000001001;

    /// @notice Precompile address for threshold encryption
    /// @dev Input: (bytes data) -> Output: bytes ciphertext
    address internal constant ENCRYPT_TE = 0x0000000000000000000000000000000000001002;

    /// @notice Precompile address for ECIES user encryption
    /// @dev Input: (bytes data, bytes32 pubKeyX, bytes32 pubKeyY) -> Output: bytes ciphertext
    address internal constant ENCRYPT_ECIES = 0x0000000000000000000000000000000000001003;

    /// @notice Submit a conditional transaction
    /// @param gasLimit Gas limit for the CTX execution
    /// @param data Encoded data: abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)
    /// @return ctxSender Address that must be funded with ETH for gas
    function submitCTX(uint256 gasLimit, bytes memory data)
        internal returns (address ctxSender)
    {
        (bool success, bytes memory returndata) = SUBMIT_CTX.staticcall(
            abi.encodeWithSignature("submitCTX(uint256,bytes)", gasLimit, data)
        );
        require(success, "BITE: submitCTX failed");
        ctxSender = abi.decode(returndata, (address));
    }

    /// @notice Encrypt data using threshold encryption
    /// @param data Data to encrypt (max 64KB)
    /// @return ciphertext Threshold-encrypted ciphertext
    function encryptTE(bytes calldata data)
        internal view returns (bytes memory ciphertext)
    {
        (bool success, bytes memory returndata) = ENCRYPT_TE.staticcall(data);
        require(success, "BITE: encryptTE failed");
        ciphertext = returndata;
    }

    /// @notice Encrypt data using ECIES with user's public key
    /// @param data Data to encrypt
    /// @param pubKeyX X coordinate of user's secp256k1 public key
    /// @param pubKeyY Y coordinate of user's secp256k1 public key
    /// @return ciphertext ECIES-encrypted ciphertext
    function encryptECIES(bytes calldata data, bytes32 pubKeyX, bytes32 pubKeyY)
        internal view returns (bytes memory ciphertext)
    {
        (bool success, bytes memory returndata) = ENCRYPT_ECIES.staticcall(
            abi.encodeWithSignature("encryptECIES(bytes,bytes32,bytes32)", data, pubKeyX, pubKeyY)
        );
        require(success, "BITE: encryptECIES failed");
        ciphertext = returndata;
    }

    /// @notice Encrypt data using ECIES with user's public key (raw bytes)
    /// @param data Data to encrypt
    /// @param publicKey User's secp256k1 public key (33 bytes, uncompressed)
    /// @return ciphertext ECIES-encrypted ciphertext
    function encryptECIES(bytes calldata data, bytes calldata publicKey)
        internal view returns (bytes memory ciphertext)
    {
        require(publicKey.length == 33, "BITE: invalid public key length");

        bytes memory pubKeyMemory = bytes(publicKey);
        bytes32 pubKeyX;
        bytes32 pubKeyY;

        assembly {
            pubKeyX := mload(add(pubKeyMemory, 33))
            pubKeyY := mload(add(pubKeyMemory, 65))
        }

        return encryptECIES(data, pubKeyX, pubKeyY);
    }
}
