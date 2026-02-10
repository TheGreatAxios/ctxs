# Rock Paper Scissors - Agents Documentation

## Project Overview
On-chain rock-paper-scissors game with encrypted moves and optional ERC-20 wagering.

## Commands

### Contracts (Foundry)
```bash
cd contracts
forge build
forge test

# Deploy using keystore account (recommended)
# First, import your key: cast wallet import deployer --interactive
forge script script/Deploy.s.sol --account deployer --rpc-url skale-testnet --broadcast --slow --legacy
```

### Frontend (Vite)
```bash
cd frontend
npm install
npm run dev
npm run build
```

## Architecture

### Contract Structure
- `RockPaperScissors.sol`: Main game logic
  - Encrypted move commitments (commit-reveal pattern)
  - ERC-20 wager handling
  - Timeout mechanism for reveals
  - Automatic winner determination

### Frontend Structure
- Vite + React + TypeScript
- Wagmi/viem for blockchain interactions
- Encryption utilities for move hashing

## Key Patterns

### Encrypted Moves
Using commit-reveal pattern:
1. Player submits hash(move + nonce)
2. Both players committed → reveal phase
3. Reveal by submitting move + nonce
4. Contract verifies hash matches

### Timeout Logic
- Player1 commits → starts timeout
- Player2 must commit within timeout or forfeit
- After both commit, reveal window opens
- First to reveal starts timer for second reveal
- Timeout → other player wins automatically

## Wager Flow
1. Optional ERC-20 token address (address(0) for ETH)
2. Amount specified on game creation
3. Both players must deposit
4. Winner receives pot (minus small protocol fee)
5. Draw → refund both

## Gas Optimizations
- Use uint8 for enum values
- Pack struct fields efficiently
- Minimize storage writes
- Use events for off-chain tracking

## Testing Strategy
- Unit tests for all game states
- Fuzz testing for random moves
- Integration tests with ERC-20
- Timeout edge cases

## Security Considerations
- Prevent front-running with encrypted commits
- Reentrancy guards on payouts
- Proper ERC-20 transfer checks
- Overflow protection (Solidity 0.8+)

## Deployment

### SKALE Network Configuration
- **Network**: SKALE Testnet (Base-Sepolia)
- **Chain ID**: 103698795
- **RPC**: https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE
- **Explorer**: https://base-sepolia-testnet-explorer.skalenodes.com:10032

### Deployment Steps

1. **Setup wallet**:
```bash
cast wallet import deployer --interactive
# Enter your private key and set a password
```

2. **Get sFUEL** from https://sfuelstation.com

3. **Set environment variable**:
```bash
export FEE_RECIPIENT=<your-fee-recipient-address>
```

4. **Deploy**:
```bash
forge script script/Deploy.s.sol --account deployer --rpc-url skale-testnet --broadcast --slow --legacy
```

5. **Verify contract**:
```bash
forge verify-contract --rpc-url skale-testnet <CONTRACT_ADDRESS> src/RockPaperScissors.sol:RockPaperScissors --verifier blockscout --verifier-url https://base-sepolia-testnet-explorer.skalenodes.com:10032/api
```

6. **Update frontend**: Add deployed address to `frontend/src/config/contract.ts`

### SKALE-Specific Flags
- `--legacy`: Required for SKALE chains (legacy transaction format)
- `--slow`: Required for scripts with multiple transactions
- `--account`: Use keystore instead of raw private key