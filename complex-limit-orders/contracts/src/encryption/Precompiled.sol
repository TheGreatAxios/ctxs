// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./types.sol";

library Precompiled {
    error PrecompiledCallFailed();
    error EmptyReturnData();
    error InvalidReturnData();
    error WrongPublicKeyLength();
    error WrongCiphertextLength();

    function submitCTX(
        address submitCTXAddress,
        uint256 gasLimit,
        bytes[] memory encryptedArgs,
        bytes[] memory plaintextArgs
    ) internal returns (address payable callbackSender) {
        bytes memory ctxData = abi.encode(encryptedArgs, plaintextArgs);
        bytes memory input = abi.encode(gasLimit, ctxData);
        (bool success, bytes memory returnData) = submitCTXAddress.staticcall(input);
        if (!success) revert PrecompiledCallFailed();
        if (returnData.length == 0) revert EmptyReturnData();
        if (returnData.length != 20) revert InvalidReturnData();
        callbackSender = payable(address(bytes20(returnData)));
    }

    function encryptTE(address encryptTEAddress, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returnData) = encryptTEAddress.staticcall(data);
        if (!success) revert PrecompiledCallFailed();
        return returnData;
    }

    function encryptECIES(address encryptECIESAddress, bytes memory data, PublicKey memory publicKey)
        internal
        returns (bytes memory)
    {
        bytes memory input = abi.encode(data, publicKey.x, publicKey.y);
        (bool success, bytes memory returnData) = encryptECIESAddress.staticcall(input);
        if (!success) revert PrecompiledCallFailed();
        return returnData;
    }
}
