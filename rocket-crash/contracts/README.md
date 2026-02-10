# Rocket Crash Smart Contracts

## Setup

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
cd contracts
forge install
```

3. Install skale-rng library:
```bash
forge install thegreataxios/skale-rng
```

## Build

```bash
forge build
```

## Test

```bash
forge test
```

## Deploy

```bash
forge script script/Deploy.s.sol --rpc-url $SKALE_RPC --broadcast --verify
```