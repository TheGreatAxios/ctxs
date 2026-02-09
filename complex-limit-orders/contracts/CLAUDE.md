# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BITE-AMM**: Confidential limit order system built on SushiSwap v2 AMM + SKALE BITE V2 (Conditional Transactions).

- Public AMM with transparent reserves (x*y=k)
- Encrypted limit orders (price, amount) using BITE threshold encryption
- CTX-based automatic execution on swap
- Front-running protection via encryption

## Tech Stack

- **Solidity**: 0.8.24 (Shanghai fork)
- **Framework**: Foundry
- **AMM**: SushiSwap v2 (Uniswap v2 compatible)
- **Encryption**: BITE V2 (SKALE threshold encryption)

## Common Commands

```bash
# Build
forge build

# Test all
forge test

# Test specific contract
forge test --match-test testLimitOrderFill

# Test with gas snapshot
forge snapshot

# Format
forge fmt
```

## Deployment

**IMPORTANT**: Always use `--sender` when deploying to ensure simulation and broadcast use the same address.

```bash
# Deploy (anvil local - uses default account)
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy (SKALE with named keystore account)
forge script script/Deploy.s.sol \
  --rpc-url skale_testnet \
  --account bite-deployer \
  --sender 0xYOUR_ADDRESS \
  --legacy \
  --slow

# Deploy (SKALE with private key directly)
forge script script/Deploy.s.sol \
  --rpc-url skale_testnet \
  --private-key 0xYOUR_PRIVATE_KEY \
  --broadcast \
  --legacy \
  --slow

# Deploy (via anvil fork - recommended for testing)
# Terminal 1: Start forked anvil
anvil --fork-url https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit

# Terminal 2: Deploy
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --sender 0xYOUR_ADDRESS
```

**Why `--sender` is required**: Foundry scripts run twice - first for simulation (local), then for broadcast (on-chain). Without `--sender`, the simulation uses a default address while broadcast uses your keystore address, causing mismatches.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SushiSwapV2Pair (Public)                 │
│  - getReserves() → (reserve0, reserve1, timestamp)          │
│  - swap(amount0Out, amount1Out, to, data)                   │
│  - mint/to (liquidity provision)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │ swap() hook
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              ConfidentialLimitOrderBook                      │
│  mapping(address => LimitOrder[]) public poolOrders         │
│                                                               │
│  submitLimitOrder(                                            │
│    address pool,           // public AMM pair address         │
│    bytes encryptedPrice,   // BITE encryptTE()                │
│    bytes encryptedAmount,  // BITE encryptTE()                │
│    bool direction          // true=0→1, false=1→0             │
│  )                                                           │
│                                                               │
│  onDecrypt(uint256[] decryptedArgs, uint256[] plainArgs)     │
│  - Called by CTX in next block                               │
│  - Checks price condition vs pool.getReserves()              │
│  - Executes pool.swap() if condition met                     │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why Public AMM + Encrypted Orders?

1. **Efficient price discovery**: Public reserves enable MEV/arbitrage to keep prices accurate
2. **Private trading intent**: Your limit orders aren't visible until filled
3. **Simple integration**: Standard Uniswap V2 interface, no custom AMM logic

### Swap-Triggered Execution

Every swap on the AMM triggers limit order checks — no separate keeper infrastructure needed. Natural swap activity automatically fills orders.

### BITE V2 Integration

- **encryptTE**: Encrypt order params using network threshold key
- **submitCTX**: Queue conditional transaction for next block
- **onDecrypt**: Callback where decrypted values are delivered

## File Structure

```
src/
├── amm/
│   ├── SushiSwapV2Factory.sol    # Pool creation
│   ├── SushiSwapV2Pair.sol       # x*y=k core with swap hook
│   └── interfaces/
│       ├── ISushiSwapV2Pair.sol
│       └── ISushiSwapV2Factory.sol
├── limitorder/
│   ├── ConfidentialLimitOrderBook.sol
│   └── LimitOrderStructs.sol
├── encryption/
│   └── BITEPrecompile.sol        # encryptTE, submitCTX interfaces
└── MockToken.sol                 # Test token

test/
├── amm/
│   └── Pair.t.sol
└── limitorder/
    └── LimitOrder.t.sol

script/
└── Deploy.s.sol
```

## BITE V2 Precompile Addresses (SKALE)

```solidity
// SKALE Testnet (example - verify actual addresses)
address constant SUBMIT_CTX_PRECOMPILE = 0x...;
address constant ENCRYPT_TE_PRECOMPILE = 0x...;
address constant ENCRYPT_ECIES_PRECOMPILE = 0x...;
```

## References

- BITE V2 Spec: ../README.md
- SushiSwap V2 Core: https://github.com/sushiswap/sushiswap
- bite-ts library: https://github.com/skalenetwork/bite-ts

## Script Creation
- Do not create scripts for PRIVATE_KEY, we use --account flag in all foundry send
