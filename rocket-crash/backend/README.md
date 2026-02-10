# Rocket Crash House Server

Single-wallet server that manages the house side of the game.

## Setup

```bash
cd house-server
pnpm install
cp .env.example .env
```

Edit `.env`:
```bash
HOUSE_PRIVATE_KEY=0xYOUR_PRIVATE_KEY  # Must be registered as house operator in contract
```

## Run

```bash
pnpm start
```

## What it does

1. **Commits targetHash** before betting opens
2. **Reveals salt** after betting closes (starts rocket)
3. **Calls checkRocket()** repeatedly until crash

## Important

The wallet address must have `isHouseOperator=true` in the contract. This is set by the contract owner calling `addHouseOperator(address)`.
