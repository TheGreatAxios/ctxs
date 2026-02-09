/**
 * UNIFIED CONFIG - Single source of truth for all addresses
 *
 * SKALE Testnet - Chain ID: 103698795
 * Deployed: Feb 2025
 */

import type { Address } from "viem";

// TokenInfo interface matches TokenSelector.tsx
export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  coinbaseId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CHAIN_ID = 103698795 as const;

// SKALE BITE V2 Precompiles (fixed across all SKALE chains)
export const PRECOMPILES = {
  encryptTE: "0x0000000000000000000000000000000000001002" as Address,
  submitCTX: "0x0000000000000000000000000000000000001001" as Address,
  encryptECIES: "0x0000000000000000000000000000000000001003" as Address,
} as const;

export const CTX_GAS_COST = BigInt("10000000000000000") as bigint; // 0.01 sFUEL

// ============================================================================
// TOKENS
// ============================================================================

export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xbeac8b7daca6735ee13c3491bd5b08aaa03cf90a" as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0x5a083117cbefed71c5d4640f88ec5287bc96ba81" as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x0d5d9697bda657c1ba2d1882dcf7bb20903d3adc" as Address,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x4c1928684b7028c2805fa1d12aced5c839a8d42c" as Address,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    coinbaseId: "weth",
  },
} as const;

export const TOKEN_LIST = Object.values(TOKENS);
export const TOKEN_BY_ADDRESS = Object.fromEntries(
  TOKEN_LIST.map((t) => [t.address.toLowerCase(), t])
) as Record<string, TokenInfo>;

// ============================================================================
// PAIRS - Derived from factory.allPairs()
// ============================================================================

export const PAIRS = {
  USDC_WETH: "0xA4607F5c29A29a409Ed32D475Aa58a71e845B50B" as Address,
  USDC_WBTC: "0x5F3FF2A6f419438915397331f1DaC2D2659FEEDe" as Address,
  USDT_WETH: "0x0087065Be9F0c9Cc57650F51932Ab14ee3423a95" as Address,
  USDT_WBTC: "0xd7859a0Dc2a04dc5A1Ac354642841AD5A2b79a17" as Address,
  WETH_WBTC: "0xBD45Df81f6bEbb1ddfBFc2747cE5aF20497bB561" as Address,
} as const;

// Pool name mapping (lowercase keys for consistent matching)
export const POOL_NAMES: Record<string, string> = {
  [PAIRS.USDC_WETH.toLowerCase()]: "USDC/WETH",
  [PAIRS.USDC_WBTC.toLowerCase()]: "USDC/WBTC",
  [PAIRS.USDT_WETH.toLowerCase()]: "USDT/WETH",
  [PAIRS.USDT_WBTC.toLowerCase()]: "USDT/WBTC",
  [PAIRS.WETH_WBTC.toLowerCase()]: "WETH/WBTC",
} as const;

// Reverse lookup: symbol -> address
export const TOKEN_ADDRESS_BY_SYMBOL = Object.fromEntries(
  TOKEN_LIST.map((t) => [t.symbol, t.address])
) as Record<string, Address>;

// ============================================================================
// CORE CONTRACTS
// ============================================================================

export const CONTRACTS = {
  factory: "0x30b60aebd4b2efad43dabbc2e6309e6d51082893" as Address,
  router: "0x1cd9585db79d7b9d6be45f0d15247f2ff58b5418" as Address,
  limitOrderBook: "0x31d1827cbbb209d61bdbd7eff401559428fe0b1e" as Address,

  // Generic CTX system
  conditionalTransactionBook: "0x0000000000000000000000000000000000000000" as Address,
  ammPriceConditionChecker: "0x0000000000000000000000000000000000000000" as Address,
  ammSwapActionExecutor: "0x0000000000000000000000000000000000000000" as Address,
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/** Get pool name from address (case-insensitive) */
export function getPoolName(address: string): string {
  return POOL_NAMES[address.toLowerCase()] ?? `${address.slice(0, 8)}...`;
}

/** Get token info by address (case-insensitive) */
export function getTokenInfo(address: string): TokenInfo | undefined {
  return TOKEN_BY_ADDRESS[address.toLowerCase()];
}

/** Get all config for a specific chain */
export function getConfig(chainId: number) {
  if (chainId !== CHAIN_ID) return null;

  return {
    chainId,
    precompiles: PRECOMPILES,
    ctxGasCost: CTX_GAS_COST,
    tokens: TOKENS,
    tokenList: TOKEN_LIST,
    pairs: PAIRS,
    poolNames: POOL_NAMES,
    // Flatten contracts for easier access
    ...CONTRACTS,
    contracts: CONTRACTS,
  };
}

/** Type for chain config */
export type ChainContractConfig = ReturnType<typeof getConfig>;

/** Get config for a specific chain (alias) */
export function getContractForChain(chainId: number): ChainContractConfig | null {
  return getConfig(chainId);
}

/**
 * React hook to get contracts for current chain
 * Usage: const contracts = useContracts();
 */
export function useContracts() {
  return CONFIG;
}

// ============================================================================
// INTERNAL DEFAULTS
// ============================================================================

const CONFIG = {
  limitOrderBook: CONTRACTS.limitOrderBook,
  factory: CONTRACTS.factory,
  router: CONTRACTS.router,
  pairs: PAIRS,
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CHAIN_ID,
  PRECOMPILES,
  CTX_GAS_COST,
  TOKENS,
  TOKEN_LIST,
  TOKEN_BY_ADDRESS,
  TOKEN_ADDRESS_BY_SYMBOL,
  PAIRS,
  POOL_NAMES,
  CONTRACTS,
  getPoolName,
  getTokenInfo,
  getConfig,
  getContractForChain,
  useContracts,
} as const;
