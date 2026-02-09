# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **documentation and specification repository** for BITE V2 (Blockchain Integrated Threshold Encryption) protocol on SKALE blockchain. It contains technical specifications for Conditional Transactions (CTXs) and Confidential Tokens — **no executable code**.

## Key References

- **Library**: https://github.com/skalenetwork/bite-ts
- **Tests/Examples**: https://github.com/skalenetwork/bite-ts/tree/develop/tests

## Architecture Overview

### BITE V2 Protocol Components

1. **Phase 1 Protocol** — Handles encryption, transport (`BITE_MAGIC_NUMBER`), and CALLDATA decryption
2. **Phase 2 Precompile Contracts**:
   - `submitCTX` — Creates and queues conditional transactions
   - `encryptTE` — Threshold encryption using network BLS public key
   - `encryptECIES` — User encryption using secp256k1 public key

### Conditional Transactions (CTXs)

CTXs enable smart contracts to decrypt data and perform actions automatically:

```
Block N:   submitCTX called → CTX queued
Block N+1: CTX included, decrypted, executed
           Finalized
```

**Key characteristics:**
- CTXs bypass block gas limits (placed before regular transactions)
- CTX calls `onDecrypt()` function of the originating smart contract
- Wallet for CTX is predictable via RNG; must be topped up in `onDecrypt()`

### Confidential Token Architecture

**Dual Encryption Strategy:**
- **Threshold Encryption (T_Key)**: Smart contract can decrypt via CTXs
- **User Encryption (U_Key)**: Users can decrypt locally (ECIES with secp256k1)

**Two-Step Execution Model:**
1. **Schedule**: Transaction submitted, no balance changes
2. **Execute**: CTX in next block applies balance changes

**Constraints:**
- `balanceOf()` reverts with `ValueIsEncrypted` error
- Events do NOT expose sender, receiver, or value
- No gas estimation support for transfer functions
- No `eth_call` execution support

**Token Interface:**
- Extends ERC-20 with EIP-2612 and EIP-3009
- Additional interface: `transfer(address to, address from, bytes[] value)`
- Requires public key registration for balance retrieval
- Users must deposit ETH to token contract to cover BITE transaction costs

### Encryption Formats

**encryptTE (Threshold Encryption):**
- Uses network BLS threshold public key
- Deterministic via block randomness
- Contract address as AAD (Additional Authentication Data)

**encryptECIES (User Encryption):**
- ECIES with AES-256-CBC, PKCS7 padding
- Uses user's secp256k1 public key (33-byte uncompressed)
- Output: `[IV (16)] [Ephemeral PubKey (33)] [Ciphertext (N)]`
- KDF: `SHA-256(Bytes(x_S))` where `S` is ECDH shared secret point

### Core Transaction Flow (Confidential Transfer)

1. Alice encrypts amount using `bite-ts` library
2. Encrypted `transfer(to, ENCRYPTED_AMOUNT)` submitted via BITE Phase 1
3. Token contract's `decryptAndExecute` calls `submitCTX` with:
   - `encryptedArgs`: `[Alice's balance, Bob's balance, amount, ...]`
   - `plaintextArgs`: `[Alice's address, Bob's address, ...]`
4. Top up `CTX_SENDER` address (returned by `submitCTX`)
5. Next block: CTX executed with decrypted values
6. Contract re-encrypts updated balances via `encryptTE()` + `encryptECIES()`

## Precompile Signatures

**submitCTX:**
- Input: `abi.encode(uint256 gasLimit, bytes data)` where `data = abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)`
- Output: `address` (CTX_SENDER)

**encryptTE:**
- Input: `bytes data` (max 64KB)
- Output: `bytes` ciphertext

**encryptECIES:**
- Input: `abi.encode(bytes data, bytes32 pubKeyX, bytes32 pubKeyY)`
- Output: `bytes` ciphertext with IV + ephemeral key
