# Deployment Instructions

## 1. Deploy Contract

```bash
# Set your private key
export PRIVATE_KEY=your_private_key

# Deploy to SKALE Testnet
forge script script/Deploy.s.sol:Deploy --rpc-url https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE --broadcast
```

## 2. Update Frontend Config

After deployment, update the contract address in:
`frontend/src/config/contracts.ts`

Change:
```typescript
nostradamusRegistry: "0x0000000000000000000000000000000000000000" as Address,
```

To your deployed address.

## 3. Run Frontend

```bash
cd frontend
npm run dev
```

## 4. Test Flow

1. Connect wallet to SKALE Testnet
2. Submit encrypted prediction (encrypts with BITE)
3. Wait for revealBlock (or reduce delay for testing)
4. Click "Reveal" → triggers CTX
5. Wait 1 block → see decrypted value
