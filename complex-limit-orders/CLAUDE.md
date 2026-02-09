# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

**BITE-AMM**: Confidential limit order system built on BiteSwapV2 AMM (SushiSwap v2 derivative) + SKALE BITE V2 (Conditional Transactions).

- Public AMM with transparent reserves (x*y=k)
- Encrypted limit orders (price, amount) via threshold encryption
- Generic conditional transaction system with pluggable conditions/actions
- Front-running protection via encryption
- CTX-based automatic execution triggered by swaps

## Project Structure

```
complex-limit-orders/
├── contracts/          # Solidity contracts (Foundry)
│   ├── src/
│   │   ├── amm/               # BiteSwapV2 AMM (Factory, Pair, Router, Library)
│   │   ├── generic/           # ConditionalTransactionBook - generic CTX system
│   │   ├── limitorder/        # ConfidentialLimitOrderBook
│   │   ├── conditions/        # IConditionChecker + implementations
│   │   ├── actions/           # IActionExecutor + implementations
│   │   └── encryption/        # BITE precompile interfaces
│   ├── script/                # Foundry deployment/test scripts
│   └── test/                  # Foundry tests
└── frontend/           # Next.js 16 + RainbowKit + wagmi
    ├── app/                   # Next.js app router
    ├── src/
    │   ├── components/        # React components
    │   ├── lib/
    │   │   ├── bite/          # BITE encryption utilities
    │   │   └── hooks/         # Custom React hooks
    │   └── wagmi.ts           # wagmi config (SKALE testnet)
    └── abi/                   # Contract ABIs
```

## Common Commands

### Contracts (Foundry)

```bash
cd contracts

# Build
forge build

# Test all
forge test

# Test specific file
forge test --match-path test/limitorder/LimitOrder.t.sol

# Test specific function
forge test --match-test testLimitOrderFill

# Gas snapshot
forge snapshot

# Format
forge fmt

# Deploy (local anvil)
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy (SKALE testnet - via anvil fork)
# Terminal 1:
anvil --fork-url https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit

# Terminal 2:
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --sender 0xYOUR_ADDRESS
```

**IMPORTANT**: Always use `--sender` when deploying. Foundry scripts simulate first, then broadcast. Without `--sender`, simulation uses a default address while broadcast uses your actual address, causing mismatches.

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
pnpm install

# Dev server (localhost:3000)
pnpm dev

# Type check
npx tsc --noEmit

# Lint (add --fix to auto-fix)
npx eslint . --max-warnings 0

# Format
npx prettier -w .

# Build
pnpm build
```

## Architecture Overview

### Generic Conditional Transaction System

The `ConditionalTransactionBook` is a pluggable system for encrypted conditional transactions:

```
┌─────────────────────────────────────────────────────────────┐
│              ConditionalTransactionBook                      │
│  - Manages user gas balances (for CTX execution costs)       │
│  - Stores encrypted conditional transactions                │
│  - Registers IConditionChecker and IActionExecutor impls     │
│  - Submits batch CTXs via BITE submitCTX precompile          │
│  - onDecrypt() callback processes decrypted values          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─► IConditionChecker.checkCondition(conditionData, decryptedValue)
                              │   └─► Returns: (met: bool, context: bytes)
                              │
                              └─► IActionExecutor.executeAction(actionData, context)
                                  └─► Returns: (success: bool, result: bytes)
```

**Flow**:
1. User submits encrypted conditional transaction + gas deposit
2. Anyone calls `checkConditionalTxs(checker, executor)` to trigger batch processing
3. Contract submits batch CTX via BITE `submitCTX` precompile
4. Next block: `onDecrypt()` called with decrypted values
5. For each tx: call condition checker → if met, call action executor

### Limit Orders Implementation

`ConfidentialLimitOrderBook` implements the generic system for AMM limit orders:

- **Condition**: `AMMPriceConditionChecker` - checks if pool price meets target
- **Action**: `AMMSwapActionExecutor` - executes swap via BiteSwapV2Router

### AMM Layer

BiteSwapV2 is a SushiSwap v2 derivative with standard x*y=k invariant:
- `BiteSwapV2Factory` - pool creation, fee recipient (0.3%)
- `BiteSwapV2Pair` - core AMM logic with `getReserves()`, `swap()`, `mint()`
- `BiteSwapV2Router` - swap routing, liquidity management
- `BiteSwapV2Library` - price calculations, pair address derivation

### BITE V2 Integration

**Precompile Addresses** (SKALE testnet - chain ID 2090472038):
- `submitCTX`: Creates conditional transaction for next block
- `encryptTE`: Threshold encryption using network BLS public key
- `encryptECIES`: User encryption via secp256k1 (not used here)

**Encryption** (frontend):
```typescript
import { encryptAmount } from '@/lib/bite/encryption';
const { thresholdEncrypted } = await encryptAmount(amount, rpcUrl);
```

## Tech Stack

**Contracts**:
- Solidity 0.8.20 (Paris evm), via_ir=false
- Foundry framework
- OpenZeppelin contracts

**Frontend**:
- Next.js 16 (App Router)
- wagmi v2 + viem v2
- RainbowKit v2
- @skalenetwork/bite v0.7.0-develop.4
- Tailwind CSS v4
- TypeScript 5.7

## Development Notes

### Solidity
- Solidity 0.8.20 (not 0.8.24) - configured in foundry.toml
- Use `nonReentrant` for state-changing functions
- Prefer `unchecked` for safe loop increments
- Gas cost per CTX: `CTX_GAS_COST = 0.006 ether` (600k gas @ 10 gwei)

### TypeScript
- Path alias `@/*` → `./src/*` and `./*`
- Strict mode enabled
- Use functional programming, avoid classes

### Frontend State
- React Query for server state
- Zustand for client state
- IndexedDB via Dexie for local order storage

## Network Configuration

**SKALE Testnet** (primary development target):
- Chain ID: `2090472038`
- RPC: `https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit`
- Explorer: `https://base-sepolia-testnet-explorer.skalenodes.com:10012`
- Native currency: sFUEL (no ETH needed)

**Polling**: 250ms for rapid transaction confirmation (SKALE has fast blocks)

## Key Files

- `contracts/src/generic/ConditionalTransactionBook.sol` - Core CTX system
- `contracts/src/limitorder/ConfidentialLimitOrderBook.sol` - Limit order book
- `contracts/src/amm/BiteSwapV2Pair.sol` - AMM pair contract
- `frontend/src/lib/bite/encryption.ts` - BITE encryption helpers
- `frontend/src/wagmi.ts` - wagmi config with SKALE chain
