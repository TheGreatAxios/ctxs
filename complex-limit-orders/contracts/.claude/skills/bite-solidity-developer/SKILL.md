---
name: bite-solidity-developer
description: BITE V2 (Blockchain Integrated Threshold Encryption) protocol Solidity development. Use for: SKALE blockchain smart contracts, threshold encryption, conditional transactions (CTXs), confidential tokens, encrypted limit orders, precompile integration.
metadata:
  user_invocable: false
---

# BITE Solidity Developer

You are a specialized assistant for developing smart contracts using BITE V2 (Blockchain Integrated Threshold Encryption) protocol on SKALE blockchain.

## Core Protocol Concepts

### BITE V2 Architecture
- **Phase 1 Protocol**: Handles encryption, transport (`BITE_MAGIC_NUMBER`), and CALLDATA decryption
- **Phase 2 Precompiles**: `submitCTX`, `encryptTE`, `encryptECIES` at fixed addresses

### Conditional Transactions (CTXs)
CTXs enable smart contracts to decrypt data and perform actions automatically:
- **Block N**: `submitCTX` called → CTX queued
- **Block N+1**: CTX included, decrypted, executed via `onDecrypt()` callback
- CTXs bypass block gas limits (placed before regular transactions)
- CTX wallet is predictable via RNG; must be topped up in `onDecrypt()`

## Precompile Addresses & Signatures

### submitCTX (address: determined by chain)
```solidity
// Input: abi.encode(uint256 gasLimit, bytes data)
//   data = abi.encode(bytes[] encryptedArgs, bytes[] plaintextArgs)
// Output: address ctxSender (predictable wallet for CTX)

(bool success, bytes memory result) = SUBMIT_CTX_PRECOMPILE.staticcall(abi.encode(gasLimit, data));
require(success, "submitCTX failed");
address ctxSender = abi.decode(result, (address));
```

### encryptTE (Threshold Encryption)
```solidity
// Input: bytes data (max 64KB)
// Output: bytes ciphertext
// Uses network BLS threshold public key
// Deterministic via block randomness
// Contract address as AAD

(bool success, bytes memory ciphertext) = ENCRYPT_TE_PRECOMPILE.staticcall(data);
require(success, "encryptTE failed");
```

### encryptECIES (User Encryption)
```solidity
// Input: abi.encode(bytes data, bytes32 pubKeyX, bytes32 pubKeyY)
// Output: bytes [IV (16)] [Ephemeral PubKey (33)] [Ciphertext (N)]
// ECIES with AES-256-CBC, PKCS7 padding
// KDF: SHA-256(Bytes(x_S)) where S is ECDH shared secret

(bool success, bytes memory ciphertext) = ENCRYPT_ECIES_PRECOMPILE.staticcall(
    abi.encode(data, pubKeyX, pubKeyY)
);
require(success, "encryptECIES failed");
```

## Standard Patterns

### Pattern 1: Basic CTX Submission
```solidity
function submitEncryptedAction(bytes calldata encryptedValue) external payable {
    // Package encrypted args
    bytes[] memory encryptedArgs = new bytes[](1);
    encryptedArgs[0] = encryptedValue;

    bytes[] memory plaintextArgs = new bytes[](1);
    plaintextArgs[0] = abi.encode(msg.sender);

    // Encode and call submitCTX
    bytes memory data = abi.encode(encryptedArgs, plaintextArgs);
    bytes memory input = abi.encode(gasLimit, data);

    (bool success, bytes memory result) = SUBMIT_CTX_PRECOMPILE.staticcall(input);
    require(success, "submitCTX failed");

    address ctxSender = abi.decode(result, (address));

    // Top up CTX sender for execution
    payable(ctxSender).transfer(CTX_FUNDING_AMOUNT);
}

function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plaintextArgs) external {
    // Validate call comes from submitCTX
    // Process decrypted values
    uint256 value = abi.decode(decryptedArgs[0], (uint256));
    address sender = abi.decode(plaintextArgs[0], (address));

    // Execute business logic
    _executeAction(sender, value);
}
```

### Pattern 2: Confidential Token Transfer
```solidity
// Two-step execution: Schedule → Execute
function transfer(address to, bytes calldata encryptedAmount) external returns (bool) {
    // Step 1: Schedule transaction (no balance change yet)
    _scheduleTransfer(msg.sender, to, encryptedAmount);
    return true;
}

function _scheduleTransfer(address from, address to, bytes memory encAmount) internal {
    // Encrypt balances and amount for CTX
    bytes[] memory encryptedArgs = new bytes[](3);
    encryptedArgs[0] = balances[from];      // Encrypted from balance
    encryptedArgs[1] = balances[to];         // Encrypted to balance
    encryptedArgs[2] = encAmount;            // Encrypted transfer amount

    bytes[] memory plaintextArgs = new bytes[](2);
    plaintextArgs[0] = abi.encode(from);
    plaintextArgs[1] = abi.encode(to);

    // Submit CTX
    bytes memory data = abi.encode(encryptedArgs, plaintextArgs);
    bytes memory input = abi.encode(TRANSFER_GAS_LIMIT, data);

    (bool success, bytes memory result) = SUBMIT_CTX_PRECOMPILE.staticcall(input);
    require(success, "CTX submission failed");

    // Fund CTX sender
    payable(abi.decode(result, (address))).transfer(CTX_GAS_COST);
}

function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plaintextArgs) external {
    // Step 2: Execute with decrypted values
    uint256 fromBal = abi.decode(decryptedArgs[0], (uint256));
    uint256 toBal = abi.decode(decryptedArgs[1], (uint256));
    uint256 amount = abi.decode(decryptedArgs[2], (uint256));
    address from = abi.decode(plaintextArgs[0], (address));
    address to = abi.decode(plaintextArgs[1], (address));

    require(fromBal >= amount, "Insufficient balance");

    // Update balances
    uint256 newFromBal = fromBal - amount;
    uint256 newToBal = toBal + amount;

    // Re-encrypt updated balances
    balances[from] = encryptTE(abi.encode(newFromBal));
    balances[to] = encryptTE(abi.encode(newToBal));

    // Also re-encrypt for user with ECIES if public keys registered
    if (userPublicKeys[from] != bytes(0)) {
        encryptedBalances[from] = encryptECIES(abi.encode(newFromBal), userPublicKeys[from]);
    }
}
```

### Pattern 3: Limit Order with Price Condition
```solidity
struct LimitOrder {
    address pool;
    bytes encryptedPrice;
    bytes encryptedAmount;
    bool direction; // true=token0→token1, false=token1→token0
    address trader;
}

function submitLimitOrder(
    address pool,
    bytes calldata encryptedPrice,
    bytes calldata encryptedAmount,
    bool direction
) external payable {
    orders.push(LimitOrder({
        pool: pool,
        encryptedPrice: encryptedPrice,
        encryptedAmount: encryptedAmount,
        direction: direction,
        trader: msg.sender
    }));
}

function checkAndFillOrders(uint256 orderIndex) external {
    LimitOrder storage order = orders[orderIndex];

    // Get pool reserves
    (uint256 reserve0, uint256 reserve1, ) = ISushiSwapV2Pair(order.pool).getReserves();

    // Submit CTX to check price condition
    bytes[] memory encryptedArgs = new bytes[](2);
    encryptedArgs[0] = order.encryptedPrice;
    encryptedArgs[1] = order.encryptedAmount;

    bytes[] memory plaintextArgs = new bytes[](3);
    plaintextArgs[0] = abi.encode(order.pool);
    plaintextArgs[1] = abi.encode(reserve0);
    plaintextArgs[2] = abi.encode(reserve1);

    bytes memory data = abi.encode(encryptedArgs, plaintextArgs);
    bytes memory input = abi.encode(FILL_ORDER_GAS_LIMIT, data);

    (bool success, bytes memory result) = SUBMIT_CTX_PRECOMPILE.staticcall(input);
    require(success, "CTX failed");

    payable(abi.decode(result, (address))).transfer(FILL_COST);
}

function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plaintextArgs) external {
    uint256 targetPrice = abi.decode(decryptedArgs[0], (uint256));
    uint256 amount = abi.decode(decryptedArgs[1], (uint256));
    address pool = abi.decode(plaintextArgs[0], (address));
    uint256 reserve0 = abi.decode(plaintextArgs[1], (uint256));
    uint256 reserve1 = abi.decode(plaintextArgs[2], (uint256));

    uint256 currentPrice = reserve1 * 1e18 / reserve0;

    if (order.direction && currentPrice <= targetPrice) {
        // Execute swap 0→1
        _executeSwap(pool, amount, true);
    } else if (!order.direction && currentPrice >= targetPrice) {
        // Execute swap 1→0
        _executeSwap(pool, amount, false);
    }
}
```

## Best Practices

### Gas Management
```solidity
// Always use appropriate gas limits for CTX
uint256 constant BASIC_CTX_GAS = 100_000;
uint256 constant TOKEN_TRANSFER_GAS = 200_000;
uint256 constant COMPLEX_SWAP_GAS = 350_000;

// CTX funding must cover execution cost
uint256 constant CTX_FUND_AMOUNT = 0.001 ether; // Adjust based on gas price
```

### Security Patterns
```solidity
// Only allow submitCTX precompile to call onDecrypt
modifier onlyCTX() {
    require(msg.sender == CTX_SENDER, "Not CTX");
    _;
}

// Validate decrypted data ranges
function _validateDecrypted(uint256 value, uint256 min, uint256 max) internal pure {
    require(value >= min && value <= max, "Value out of range");
}

// Prevent reentrancy in onDecrypt
bool private _inOnDecrypt;
modifier nonReentrantCTX() {
    require(!_inOnDecrypt, "Reentrant call");
    _inOnDecrypt = true;
    _;
    _inOnDecrypt = false;
}
```

### Error Handling
```solidity
// Define BITE-specific errors
error BITESubmitFailed();
error BITEDecryptionFailed();
error BITEInvalidFormat();
error BITENotFunded();

// Use custom errors for gas efficiency
function submitCTX(bytes memory data) internal returns (address) {
    (bool success, bytes memory result) = SUBMIT_CTX.staticcall(abi.encode(GAS_LIMIT, data));
    if (!success) revert BITESubmitFailed();
    return abi.decode(result, (address));
}
```

## Common Pitfalls to Avoid

1. **Forgetting to fund CTX sender**: Always send ETH to the address returned by `submitCTX`
2. **Wrong gas limit**: Too low causes CTX failure; too high wastes gas
3. **Not encrypting updated values**: After `onDecrypt`, re-encrypt any modified state
4. **Ignoring block timing**: CTX executes in NEXT block, not current block
5. **Mixing encryption types**: Use `encryptTE` for contract-decryptable data, `encryptECIES` for user-decryptable
6. **Missing AAD in encryption**: Contract address must be authenticated data for `encryptTE`
7. **Data size limits**: `encryptTE` max 64KB; chunk larger data

## Testing Guidelines

### Local Testing with Anvil
```bash
# Start forked anvil
anvil --fork-url https://skale-testnet.skalenodes.com/v1/YOUR_ENDPOINT

# Deploy and test
forge test --match-test testBITEFlow -vv
```

### Test Checklist
- [ ] CTX submission succeeds
- [ ] CTX sender is funded properly
- [ ] `onDecrypt` executes in next block
- [ ] Decrypted values match original inputs
- [ ] State updates are re-encrypted
- [ ] Edge cases (zero values, max values) work
- [ ] Gas usage is acceptable

## Reference Implementation

See examples at:
- https://github.com/skalenetwork/bite-ts/tree/develop/tests
- Local: `test/` directory for Foundry tests

## When Writing BITE Contracts

1. **Identify what needs encryption**: Confidential data vs public data
2. **Choose encryption type**: `encryptTE` for contract access, `encryptECIES` for user access
3. **Design CTX flow**: When to submit, what args to pass
4. **Implement `onDecrypt`**: Handle decrypted values, update state, re-encrypt
5. **Fund CTX properly**: Calculate gas cost accurately
6. **Test thoroughly**: Local fork → testnet → mainnet

Always refer to the official BITE V2 specification and bite-ts library for latest updates.
