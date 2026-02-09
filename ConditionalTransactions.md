# Conditional Txs

- BITE - Blockchain Integrated Threshold Encyption
- Blockchain: SKALE
- What is it? the ability to execute encrypted transactions on a condition. Automatically included in N+1 Blockchain

## Technical Notes (Random Order)

1. The user submits encryptedData to the DApp in **Block A**, and the data is stored in the DApp state.
2. In **Block B**, someone calls decryptAndExecute in the DApp. Inside that call, the precompiled contract submitCTX executes using the encryptedData from step 1. submitCTX computes the sender and signature for the CTX, signs it using the computed values, and adds the CTX to the CTXQueue. Finally, submitCTX returns the CTX sender address.
3. The CTX is included in the **Block B+1** proposal and sent to consensus.
4. Consensus returns **Block B+1** to skaled, now containing the CTX with decrypted values.
5. The CTX is executed.
6. **Block B+1** is finalized.

The CTX lifetime spans 2 blocks (B and B+1). Once submitted, the CTX cannot be canceled.

BITE V2 and Confidential Token specification 
Introduction
This document provides a detailed flow of transactions sent via BITE V2 + confidential token. 
BITE V2 overview 
Please see BITE V2 detailed specification here
BITE V2 extends BITE V1 by enabling smart contracts to store encrypted data and request decryption directly from within Solidity and the EVM.
Smart contract developers can invoke the threshold decryption function provided by the BITE Solidity library, passing the encrypted data as input. The BITE protocol then performs decryption using a consensus committee, identical to the mechanism used in BITE V1.
When the decryption function is called in block X, the decryption process is executed as part of SKALE consensus for block X + 1. Upon completion, the decrypted data is automatically delivered back to the requesting smart contract via a special-purpose transaction included in block X + 1.
With BITE V2, each block can include Conditional Transactions (CTXs) — transactions initiated by smart contracts execution in the previous block.
CTXs enable smart contracts to decrypt data and perform actions automatically on this data.
BITE Infrastructure and Libraries
This design relies on the BITE infrastructure:
BITE Phase 1 Protocol: Handles the encryption, transport (via BITE_MAGIC_NUMBER), and decryption of CALLDATA.
BITE Phase 2 Precompile Contracts: Provides the submitCTX and Encryption mechanism.
(Future development) BITE Encryption Libraries: Standard library contracts provided by BITE (not precompiles) are used for re-encrypting data when state changes:
IThresholdEncryptor: Encrypts data using the BITE T_Key.
IUserEncryptor: Encrypts data using a specified U_Key.
Conditional Transactions (CTXs)
Overview 
With BITE V2, each block can include Conditional Transactions (CTXs) — transactions initiated by smart contracts execution in the previous block.
CTXs enable smart contracts to decrypt data and perform actions automatically on this data.
Transaction Flow

A Smart Contract in block N calls submitCTX precompile passing an encryptedArguments array and an plaintextArguments array of plaintext arguments and gasLimit for the future CTX transaction.
A CTX transaction is added to the next block. CTX transactions are placed in front of regular transactions in the block. They are not subject to the block gas limit.
In order for CTX to pass, the smart-contract has to top up the wallet W that will send it. The wallet W is generated based on RNG and can be predicted at the time CTX is submitted to submitCTX precompiled contract. In onDecrypt the smart-contract can transfer the remaining balance from W to itself.
CTX transaction to field is the smart-contract that originated it. The smart-contract sends a transaction to itself.
CTX transaction always calls onDecrypt function of the smart-contract that originated them.
CTX transactions are decrypted during the same batch decrypt as the BITE Phase 1 transaction, during finalization of block N. Therefore, BITE Phase 2 does not change performance compared to BITE Phase 1.
Encrypted argument spec
Each encrypted argument will have the same RLP format as for BITE Phase 1 encrypted data field. When the data is decrypted and is passed to VM for execution, VM will verify that txn.to == decryptedData.to, otherwise such transaction will not be executed.
Smart Contract Requirements for Working with CTX (OnDecrypt)
To interact with CTX, a smart contract must implement the onDecrypt() callback function.
If a smart contract defines an onDecrypt() function, it can initiate a decryption in Block N. The decryption results are passed to the onDecrypt() function in Block N+1.
This enables an asynchronous execution model where:
the decryption request is triggered in one block
the result is securely returned in the next block
and the contract can continue its logic using the decrypted data inside onDecrypt().
Submit CTX and Encryption mechanism
BITE V2 precompiled contracts  
submitCTX 
Creates a CTX from the input parameters and submits it into BITE2TransactionQueue. BITE2TransactionQueue is storing BITE2 transactions created during execution. SubmitCTX returns an address used to send the associated BITE2 confidential transaction (CTX). SubmitCTX precompiled smart contract that will be called from external smart contract. SubmitCTX receives 2 arguments encoded using abi.encode - uint256 gasLimit, bytes data, where data is encoded using abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs).
Input format:
bytes `_in` — ABI-encoded parameters: abi.encode(uint256 gasLimit, bytes data). Here, `gasLimit` is the limit for the scheduled CTX, and `data` is the payload to be passed within the CTX (ABI-encoded as  abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)).
Output format:
bytes `_out` — address (20 bytes).

encryptTE
This process encrypts data using the network's BLS threshold encryption public key, employing deterministic seeding via block randomness and utilizing the smart contract address as Additional Authentication Data (AAD).

Nodes generate a common random value, R, during the consensus round.
R is used as the seed for the ThresholdEncryption algorithm to guarantee that all nodes generate the identical ciphertext for a given plaintext.
Nodes execute the standard ThresholdEncryption algorithm (as described in this document), using the ConfidentialToken contract address as the AAD for the ThresholdEncryption algorithm input.
Input format:
bytes `_in` — data to be encrypted.
data - Plaintext data to encrypt (max 64KB)
Output format:
bytes `_out` — encrypted ciphertext. Serialized Ciphertext bytes that can only be decrypted by the network's threshold signature holders.

encryptECIES

Encrypts the provided data using the account's `secp256k1` public key. A comprehensive description is provided here and further elaborated in the Mathematical Model section below. This scheme allows storing data that can be decrypted by its owner in a smart contract.
Input format:
bytes `_in` — data to be encrypted and 64-byte data consisting of the `x` and `y` coordinates of the user's public key: abi.encode(bytes data, bytes32 pubKeyX, bytes32 pubKeyY). 
data - Plaintext data to encrypt (max 64KB)
pubKeyX,pubKeyY - Recipient's uncompressed public key coordinates
Output format:
bytes `_out` — ECIES-encrypted ciphertext (AES-256-CBC with PKCS7 padding) alongside associated data: [ IV (16 bytes) ] [ Ephemeral Public Key (33 bytes) ] [ Ciphertext (N bytes) ] .
Mathematical Model of Encryption (encryptECIES)
This section defines the operations using standard text notation.
Domain Parameters
Let the curve E be defined over a finite field F_p with generator point G of order n .

User Private Key: d_U (integer in range [1, n-1]), derived via BIP-44.
User Public Key: Q_U = d_U * G (Point multiplication).
Key Agreement (ECDH)
Encryption requires an ephemeral key pair generated by the sender (the Encryptor Contract).

Ephemeral Private Key: r = random integer in range [1, n-1].
Ephemeral Public Key:  R = r * G
Shared Secret Point:  S =  r * Q_U . Let S have coordinates (x_S, y_S) .

Note: The user derives the same point S using their private key d_U: S = d_U * R

Proof of equality: S = r * (d_U * G) = d_U * (r * G) = (r * d_U) * G
Key Derivation Function (KDF)
To convert the elliptic curve point S into a usable symmetric encryption key K_enc, we apply a standard hashing function to the x-coordinate.

K_enc = SHA-256(Bytes(x_S))

x_S: The 32-byte x-coordinate of point S .
K_enc: The resulting 256-bit AES key.
Encryption / Decryption
Let M be the payload (Hex String of balance) and IV be a random 16-byte vector.

Encryption:
C = AES-CBC-Encrypt(Key=K_enc, IV=IV, Data=PKCS7(M)

Decryption:
M = PKCS7-Decrypt(AES-CBC-Decrypt(Key=K_enc, IV=IV, Data=C))
Core Use Cases: BITE V2 + Confidential token 
Confidential token implementation aims to provide confidentiality for both user balances (state) and transaction details (inputs).
Transaction Confidentiality (BITE Phase 1): Users submit transactions using the BITE Phase 1 format. The entire transaction payload (e.g., the transfer function call including the amount and recipient) is encrypted by the client. The transaction is addressed to BITE_MAGIC_NUMBER. The BITE protocol decrypts the payload securely within the EVM execution environment. This ensures that inputs (like the transfer amount) are hidden on the public ledger.
State Confidentiality (BITE Phase 2): Balances are stored encrypted on-chain. BITE Phase 2 Conditional Transactions (CTXs) are used to securely decrypt these balances, perform the transfer logic using the plaintext inputs provided by Phase 1, and re-encrypt the results.
Architecture: Dual Encryption Strategy
To allow the contract to manage the ledger while enabling users to view their own balances, a dual encryption strategy is employed:
Threshold Encryption (T_Key): Stored balances are encrypted using the BITE network threshold key. The smart contract can decrypt these via BITE Phase 2 CTXs.
User Encryption (U_Key): Balances are simultaneously encrypted using the individual user’s public key (e.g., ECIES). Users can decrypt this locally.
CTX flow with encryption
The following describes the flow for a confidential token transfer (sender: Alice, receiver: Bob, amount: `N`, smart contract address: `A`).
Alice encrypts amount using the bite-ts library.
Alice generates the payload for transfer(to, ENCRYPTED_AMOUNT) and encrypts it using the bite-ts library. A transaction with this payload is added to the transaction queue, decrypted by consensus, and then included in a block (standard BITE transaction flow).
The decrypted transaction is included in the block (the recipient is now plaintext). However, Alice’s and Bob’s balances remain encrypted as well as the transfer amount.
The token contract calls BITE.decryptAndExecute, which should:
Call the submitCTX precompile with the following parameters: abi.encode(STANDARD_GAS_LIMIT_FOR_TRANSFER_TRANSACTION, abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)), where
encryptedArgs = [Alice’s balance, Bob’s balance, amount, …] and plaintextArgs = [Alice’s address, Bob’s address, …].
submitCTX adds a new CTX to the BITE2 transaction queue and returns the address (CTX_SENDER), which will be used to submit the CTX.
Top up the balance of CTX_SENDER.
The CTX is pulled by consensus; all encryptedArgs are decrypted, and the CTX is included in the next block.
The token contract executes the transfer using the decrypted balances and associated metadata.
The token contract calls encryptTE(ALICE_UPDATED_BALANCE), encryptECIES(ALICE_UPDATED_BALANCE,ALICE_PUBLIC_KEY), encryptTE(BOB_UPDATED_BALANCE), and encryptECIES(BOB_UPDATED_BALANCE, BOB_PUBLIC_KEY)), and stores the re‑encrypted balances in state.
Transaction flow for contract-initiated transfer  
To allow external smart contracts (SC) to interact with ConfidentialToken, we have added additional interfaces for token transfer. This is required to let SCs send value after it is encrypted using encryptTE precompiled contract.
Alongside the standard interface, we suggest adding a new interface: transfer(address to, address from, bytes[] value).
The following describes the flow for a confidential token transfer from an SC (sender: SC, receiver: Bob, amount: N, smart contract address: A):
SC encrypts amount using the encryptTE precompiled.
SC calls transfer(address to, address from, bytes[] value).
The transfer function calls submitCTX precompiled with the following parameters: abi.encode(STANDARD_GAS_LIMIT_FOR_TRANSFER_TRANSACTION, abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)).
value is added into bytes[] encryptedArgs.
submitCTX adds a new CTX to the BITE2 transaction queue and returns the address (CTX_SENDER), which will be used to submit the CTX.
The transfer function also initiates a top-up of CTX_SENDER's balance.
The CTX is pulled by consensus; all encryptedArgs are decrypted, and the CTX is included in the next block.
The token contract executes the transfer using the decrypted balances and associated metadata.
The token contract calls encryptTE(SC_UPDATED_BALANCE), encryptECIES(SC_UPDATED_BALANCE, SC_PUBLIC_KEY), encryptTE(BOB_UPDATED_BALANCE), and encryptECIES(BOB_UPDATED_BALANCE, BOB_PUBLIC_KEY), and stores the re‑encrypted balances in state.
Confidential Token Smart contract
Overview
This part describes an encrypted ERC-20–based token leveraging BITEV2 encryption on SKALE, designed to enable confidential balances and private transfers.

Confidential token extends ERC-20 functionality and incorporates features from EIP-2612 and EIP-3009, with additional encrypted execution semantics.
ERC-20 
The token follows the ERC-20 standard with modifications described below to support encrypted balances and private execution.
EIP-2612 & EIP-3009 (x402)
The token supports:

EIP-2612 (permit-based approvals)
EIP-3009 (transfer authorization by signature)

All transfer-related functionality from these standards follows the encrypted execution model described in this document.
Notice
Accounts without a registered public key may interact with the token without restrictions. However, such accounts cannot retrieve their balance, as balances are stored and handled in encrypted form.

Difference from standard tokens 
Two-Step Execution Model: 

The following functions use a two-step execution process:
Transfer
transferFrom
mint
burn
all transfer-related functionality from EIP-2612 and EIP-3009
sensitive data was removed from standard events

Step 1 — Scheduling Transaction

The transaction has a standard format.
It does not immediately affect balances.
Successful execution means the operation has been scheduled, not completed.

Step 2 — Execution Transaction

All balance changes are applied in a separate transaction in the upcoming block. 
This transaction is submitted automatically and requires no additional action from the original sender.

Encrypted State Behavior
balanceOf always reverts with a ValueIsEncrypted error.
Events do not expose sender, receiver, or transferred value.
Gas estimation is not supported for any transferring function.
eth_call  execution is not supported for any transferring function.
These constraints are intentional and ensure confidentiality of balances and transfer details.
Unchanged Functions
approve
transferFrom (standard ERC-20 usage)
These functions remain available as part of standard ERC-20 functionality and are not encrypted.
New Functionality

The following additional capabilities are introduced to support encrypted execution:
Registering a public key for any account address
Retrieving the encrypted balance of an account with a registered public key
Setting the address of the SubmitCTX precompiled contract
Setting the address of the EncryptTE precompiled contract
encryptedBalanceOf getter
A user has to deposit ETH to the token to cover BITE transactions costs before interaction with the token

Examples/Tests:
https://github.com/skalenetwork/bite-ts/blob/develop/tests/Game.sol
https://github.com/skalenetwork/bite-ts/blob/develop/tests/test.js

Library: https://github.com/skalenetwork/bite-ts

Goals:
- Brainstorm ideas and bulid multiple examples iwth BITE2/CTXs

