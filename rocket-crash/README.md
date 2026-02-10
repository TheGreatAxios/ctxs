# Rocket Crash - SKALE Edition

A provably fair crash gambling game built on SKALE blockchain using native RNG and BITE protocol.

## Overview

Players bet and choose an auto-eject multiplier. The rocket takes off and crashes at a predetermined point. If you eject before the crash, you win your bet × eject multiplier. If not, you burn.

## Smart Contracts

### Prerequisites

Install dependencies:
```bash
cd contracts
forge install
npm install @dirtroad/skale-rng
```

### Deployment

```bash
forge build
forge test
forge script script/Deploy.s.sol --rpc-url <SKALE_RPC> --broadcast
```

## Frontend

### Setup

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Game Mechanics

1. **Betting Phase (10 blocks)**: Players board with bet + auto-eject multiplier
2. **Launch**: Submit CTX to decrypt crash point  
3. **Resolution**: Crash point revealed, payouts processed

### Crash Point Formula

```
Multiplier = 0.99 * E / (E - (R % E))
```

Where:
- R = Random number from SKALE consensus
- E = House edge factor (9900 = 99% RTP)

Minimum crash: 1.01x

## Architecture

```
contracts/
├── src/
│   ├── Rocket.sol          # Main game logic
│   ├── IBITE.sol           # BITE precompile interface
│   └── SkaleRNG.sol        # RNG interface (via npm)
└── test/
    └── CrashMath.t.sol     # Distribution tests

frontend/
├── src/
│   ├── components/
│   │   ├── LaunchPad.tsx       # Betting UI
│   │   ├── FlightView.tsx      # Rocket animation
│   │   └── PassengerManifest.tsx # Agent list
│   ├── hooks/
│   │   └── useContract.ts      # Web3 interactions
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── App.tsx
└── public/
    └── assets/
```