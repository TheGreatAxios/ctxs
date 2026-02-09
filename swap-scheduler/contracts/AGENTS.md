# BITE-AMM Agent Reference Guide

This file contains essential context for AI agents working on the BITE-AMM codebase.

## Architecture Overview

BITE-AMM is a **confidential limit order system** built on SushiSwap V2 AMM + SKALE BITE V2 (Conditional Transactions).

- **Public AMM**: Transparent reserves (x*y=k)
- **Encrypted Limit Orders**: Price/amount hidden until execution
- **Automatic Execution**: Triggered by price changes from normal swaps

## System Flow

### 1. Normal Swaps (Public)
Users swap tokens via router with transparent pricing. Every swap updates pool reserves.

### 2. Limit Orders (Confidential)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OFF-CHAIN (User's Client)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. User encrypts order parameters:                                          │
│    - encryptedPrice = bite.encryptMessage(targetPrice)                     │
│    - encryptedAmount = bite.encryptMessage(swapAmount)                     │
│ 2. User signs authorization:                                               │
│    - signature = sign(pair, amount0Out, amount1Out, user, amountInMax, nonce)│
│ 3. User submits to LOB with: encryptedPrice, encryptedAmount, signature    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ ON-CHAIN: LOB.submitLimitOrder()                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ - Stores pre-encrypted bytes (LOB CANNOT read the values)                  │
│ - Stores signature for later authorization                                  │
│ - Deducts gas deposit (0.01 ETH)                                           │
│ - Order sits waiting for price condition...                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ Trigger: ANY Swap Happens on Pool                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ - Pool reserves change                                                     │
│ - Pair._checkLimitOrders() called                                          │
│ - LOB.checkOrders() iterates through ALL active orders                    │
│ - For each order: submits CTX with pre-encrypted data                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ NEXT BLOCK: LOB.onDecrypt() Callback                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ - Receives decrypted values: targetPrice, amount                           │
│ - Checks current pool price vs target price                                │
│ - If condition NOT met: order remains active, waits for next trigger      │
│ - If condition MET: calls pair.fillLimitOrder(signature)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pair.fillLimitOrder()                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ - Verifies signature (proves user authorized this specific swap)          │
│ - Pulls input tokens from user (requires prior approval)                   │
│ - Executes swap                                                            │
│ - Marks order as filled                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why Pre-Encryption Off-Chain?

Using `bite.encryptMessage()` off-chain means:
- User controls their private data until execution
- LOB stores encrypted bytes without knowing the values
- Threshold decryption only happens when CTX is submitted
- Front-running protection: price/amount hidden until fill

### Why Signature-Based Authorization?

The signature solves a critical problem:

| Problem | Solution |
|---------|----------|
| LOB needs to execute swap on user's behalf | User signs authorization in advance |
| User retains token custody | User approves **pair**, not LOB |
| LOB cannot steal user tokens | Pair verifies signature before pulling |

The signature binds: `sign(pair, outputAmounts, recipient, maxInput, nonce)`

Only the user who signed can have tokens pulled from their address.

### Why Every Swap Triggers Check?

No keeper infrastructure needed - natural swap activity automatically:
1. Updates pool price
2. Triggers limit order checks
3. Submits CTX for encrypted orders

## Important Invariants

1. **Pre-encrypted data is opaque**: LOB cannot decrypt, only stores and forwards
2. **Signature is public authorization**: Verifiable on-chain by pair
3. **Orders persist across blocks**: Can be checked multiple times until filled
4. **Gas deducted per CTX submission**: Each check costs user gas deposit
5. **User approves pair directly**: No token custody transfer to LOB

## File Structure

```
src/
├── amm/
│   ├── BiteSwapV2Factory.sol    # Pool creation
│   ├── BiteSwapV2Pair.sol       # x*y=k + fillLimitOrder()
│   ├── BiteSwapV2Router.sol     # Swap routing
│   ├── BiteSwapV2Library.sol    # Helper functions
│   └── interfaces/
│       ├── IBiteSwapV2Factory.sol
│       ├── IBiteSwapV2Pair.sol
│       └── ILimitOrderBook.sol
├── limitorder/
│   ├── ConfidentialLimitOrderBook.sol  # Main LOB contract
│   └── LimitOrderStructs.sol          # Data structures
├── encryption/
│   └── BITEPrecompile.sol             # BITE V2 interfaces
└── MockToken.sol
```

## Critical Functions

### BiteSwapV2Pair.sol

```solidity
// Normal swap - called by router
function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)

// Limit order fill - called by LOB with user signature
function fillLimitOrder(
    uint256 amount0Out,
    uint256 amount1Out,
    address to,              // Must match signer
    uint256 amountInMax,     // Slippage protection
    uint256 nonce,
    uint8 v, bytes32 r, bytes32 s
) returns (uint256 amountIn)
```

### ConfidentialLimitOrderBook.sol

```solidity
// Submit encrypted limit order
function submitLimitOrder(
    address pool,
    bytes calldata encryptedTargetPrice,  // Pre-encrypted
    bytes calldata encryptedAmount,        // Pre-encrypted
    bool direction,
    uint256 deadline,
    bytes calldata signature              // User's authorization
)

// Called by pair after every swap
function checkOrders(address pool)

// BITE V2 callback - receives decrypted values
function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs)
```

## Security Considerations

1. **Double-spending prevention**: `gasDeducted` flag prevents refund on cancel if gas used
2. **Signature verification**: Pair verifies signer = recipient (self-execution only)
3. **Slippage protection**: `amountInMax` prevents excessive token pull
4. **Reentrancy guards**: Both pair and LOB use locks
5. **Pool validation**: Only pools from factory are accepted

## Testing

```bash
# Test AMM/pair (Goal #1)
forge test --match-test testSwap

# Test limit orders (Goal #2)
forge test --match-contract LimitOrderTest

# All tests
forge test
```

## External References

- **BITE V2 Spec**: `../README.md`
- **bite-ts library**: https://github.com/skalenetwork/bite-ts
- **Encryption example**: https://github.com/skalenetwork/bite-ts/blob/develop/tests/test.js#L100
- **SushiSwap V2**: https://github.com/sushiswap/sushiswap

## Common Tasks

### Add new limit order field
1. Update `LimitOrder` struct in `LimitOrderStructs.sol`
2. Update `submitLimitOrder()` parameters
3. Update `onDecrypt()` if used in decryption
4. Add to test helper functions

### Modify gas cost
1. Update `CTX_GAS_COST` constant in `ConfidentialLimitOrderBook.sol`
2. Update tests that use `value` field

### Change signature scheme
1. Update digest construction in `fillLimitOrder()`
2. Update off-chain signing in client code
3. Update signature length validation

## Known Issues / TODO

- [ ] Consider adding nonce increment on fill for replay protection
- [ ] Consider batch order filling for gas efficiency
- [ ] Document exact slippage tolerance percentage
- [ ] Add events for gas deduction in checkOrders
