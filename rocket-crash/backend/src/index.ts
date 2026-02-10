#!/usr/bin/env tsx
/**
 * Rocket Crash House Server
 *
 * Manages the house side of the rocket crash game:
 * - Commits targetHash before betting
 * - Reveals salt after betting closes
 * - Calls checkRocket() until crash
 */

import { ethers, Wallet, JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const HOUSE_PRIVATE_KEY = process.env.HOUSE_PRIVATE_KEY || '';
const CHECK_INTERVAL_MS = 2500;

if (!HOUSE_PRIVATE_KEY) {
  throw new Error('HOUSE_PRIVATE_KEY required');
}

const CONTRACT_ABI = [
  'function commitCrashPoint(uint256 flightNum, uint256 targetHash) external',
  'function revealSalt(uint256 flightNum, uint256 salt) external',
  'function checkRocket(uint256 flightNum) external',
  'function getFlightInfo(uint256 flightNum) external view returns (uint256 launchTime, uint256 secondsRemaining, uint256 totalPot, uint256 passengerCount, bool isBettingOpen)',
  'function getFlightState(uint256 flightNum) external view returns (bool hasCommitment, bool saltRevealed, bool isFlying, bool isCrashed, bool hasPassengers)',
  'function getFlightMultiplier(uint256 flightNum) external view returns (uint256 currentMultiplier, uint256 crashPoint)',
  'function currentFlight() external view returns (uint256)',
  'event FlightCrashed(uint256 indexed flightNumber, uint256 crashPoint, uint256 finalMultiplier)',
];

class HouseServer {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: ethers.Contract;
  private isProcessing = false;
  private salts = new Map<number, number>();

  constructor() {
    this.provider = new JsonRpcProvider(RPC_URL);
    this.wallet = new Wallet(HOUSE_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);

    console.log(`[House] Wallet: ${this.wallet.address}`);
    console.log(`[House] Contract: ${CONTRACT_ADDRESS}`);
  }

  async start() {
    console.log('[House] Starting house server...');

    setInterval(() => this.processGameLoop(), CHECK_INTERVAL_MS);
    await this.processGameLoop();
  }

  private async processGameLoop() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const flightNum = await this.contract.currentFlight();
      const [hasCommit, saltRev, flying, crashed, hasPass] = await this.contract.getFlightState(flightNum);
      const [launchTime, , totalPot, passCount, bettingOpen] = await this.contract.getFlightInfo(flightNum);
      const [mult, ] = await this.contract.getFlightMultiplier(flightNum);

      console.log(`[House] Flight #${flightNum} | Passengers: ${passCount} | Pot: ${ethers.formatEther(totalPot)} sFUEL | ${(mult/100).toFixed(2)}x`);

      // Commit if needed
      if (!hasCommit && !hasPass) {
        await this.commit(flightNum);
      }

      // Reveal salt if betting closed
      if (hasCommit && hasPass && !saltRev && !flying) {
        if (Math.floor(Date.now()/1000) >= Number(launchTime)) {
          await this.reveal(flightNum);
        }
      }

      // Check while flying
      if (flying && !crashed) {
        await this.check(flightNum);
      }

    } catch (e: any) {
      console.error('[House]', e.message);
    } finally {
      this.isProcessing = false;
    }
  }

  private async commit(flightNum: number) {
    const salt = Math.floor(Math.random() * 100);
    const targetHash = Math.floor(Math.random() * 200);
    this.salts.set(flightNum, salt);
    console.log(`[House] Committing flight #${flightNum}: targetHash=${targetHash}, salt=${salt}`);

    try {
      const tx = await this.contract.commitCrashPoint(flightNum, targetHash);
      await tx.wait();
      console.log(`[House] Committed! TX: ${tx.hash}`);
    } catch (e: any) {
      console.error(`[House] Commit failed: ${e.message}`);
    }
  }

  private async reveal(flightNum: number) {
    const salt = this.salts.get(flightNum);
    if (salt === undefined) {
      console.error(`[House] No salt for flight #${flightNum}`);
      return;
    }

    console.log(`[House] Revealing salt=${salt} for flight #${flightNum}`);

    try {
      const tx = await this.contract.revealSalt(flightNum, salt);
      await tx.wait();
      console.log(`[House] Revealed! Rocket launched! TX: ${tx.hash}`);
    } catch (e: any) {
      console.error(`[House] Reveal failed: ${e.message}`);
    }
  }

  private async check(flightNum: number) {
    try {
      const tx = await this.contract.checkRocket(flightNum);
      const receipt = await tx.wait();

      // Check for crash event
      for (const log of receipt?.logs || []) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'FlightCrashed') {
            console.log(`[House] CRASHED at ${parsed.args.finalMultiplier / 100}x!`);
            this.salts.delete(flightNum);
            return;
          }
        } catch {}
      }

      console.log(`[House] Still flying...`);
    } catch (e: any) {
      if (!e.message.includes('Check too soon')) {
        console.error(`[House] Check failed: ${e.message}`);
      }
    }
  }
}

new HouseServer().start().catch(console.error);
