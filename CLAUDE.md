# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

Documentation for **BITE V2** (Blockchain Integrated Threshold Encryption) protocol on SKALE blockchain.

## Key References

- **Library**: https://github.com/skalenetwork/bite-ts
- **Tests/Examples**: https://github.com/skalenetwork/bite-ts/tree/develop/tests

## BITE Phase 1

Handles encryption, transport, and CALLDATA decryption.

**Key Concepts:**
- `BITE_MAGIC_NUMBER`: Special address that identifies BITE transactions
- Entire transaction payload is encrypted by client
- Protocol decrypts payload within EVM execution environment
- Transaction submitted in Block N → decrypted and included in Block N+1

## BITE Phase 2

Enables smart contracts to store encrypted data and request decryption directly from Solidity.

### Precompile Addresses

- `submitCTX`: `address(0x1b)`
- `encryptTE`: `address(0x1c)`
- `encryptECIES`: `address(0x1d)`

### Conditional Transactions (CTXs)

Smart contracts can initiate decryption in Block N; results delivered via `onDecrypt()` in Block N+1.

```
Block N:   submitCTX called → CTX queued
Block N+1: CTX included, decrypted, executed → onDecrypt() called
```

**Key characteristics:**
- CTXs bypass block gas limits (placed before regular transactions)
- CTX is a self-call to originating contract
- CTX always calls `onDecrypt(bytes[], bytes[])` function
- Wallet for CTX is predictable via RNG; must be topped up in `onDecrypt()`
- CTX lifetime spans 2 blocks (submitted in N, executed in N+1)
- Once submitted, CTX cannot be canceled

### submitCTX Precompile

Creates and queues a conditional transaction.

```solidity
uint256 ctxGasLimit = GAS_LIMIT_FOR_CTX;
bytes memory ctxData = abi.encode(encryptedArgs, plaintextArgs);
bytes memory input = abi.encode(ctxGasLimit, ctxData);
(bool success, bytes memory result) = address(0x1b).staticcall(input);
address ctxSender = address(bytes20(result)); // Extract wallet to top up
```

**Signature:**
- Input: `abi.encode(uint256 gasLimit, bytes data)` where `data = abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)`
- Output: `address` (CTX_SENDER) — wallet to top up for gas

### encryptTE Precompile

Threshold encryption using network BLS public key.

**Properties:**
- Deterministic via block randomness
- Contract address as AAD (Additional Authentication Data)
- Max data size: 64KB

**Signature:**
- Input: `bytes data`
- Output: `bytes` ciphertext

### encryptECIES Precompile

User encryption using secp256k1 public key (ECIES).

**Properties:**
- ECIES with AES-256-CBC, PKCS7 padding
- Uses user's secp256k1 public key (uncompressed)
- Output: `[IV (16)] [Ephemeral PubKey (33)] [Ciphertext (N)]`
- Max data size: 64KB

**Signature:**
- Input: `abi.encode(bytes data, bytes32 pubKeyX, bytes32 pubKeyY)`
- Output: `bytes` ciphertext with IV + ephemeral key

**ECDH Key Agreement:**
- User: `Q_U = d_U * G` (public key from private)
- Ephemeral sender: `R = r * G` (random `r`)
- Shared secret: `S = r * Q_U = d_U * R`
- Symmetric key: `K_enc = SHA-256(Bytes(x_S))`
- Encrypt: `C = AES-CBC(K_enc, IV, PKCS7(M))`

## Smart Contract Requirements

**onDecrypt Callback:**
Contracts must implement `onDecrypt()` to receive decrypted CTX results:

```solidity
function onDecrypt(bytes[] calldata decryptedArguments, bytes[] calldata plaintextArguments) external {
    // decryptedArguments: values decrypted by consensus
    // plaintextArguments: values passed in plain (e.g., addresses)
    // Transfer remaining ETH from CTX_SENDER to contract here
}
```

## Solidity Version

Use `pragma solidity ^0.8.13;` for BITE V2 contracts.

## Example Contracts

- `Game.sol`: https://github.com/skalenetwork/bite-ts/blob/develop/tests/Game.sol
- `test.js`: https://github.com/skalenetwork/bite-ts/blob/develop/tests/test.js
