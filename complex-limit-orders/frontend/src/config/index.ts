/**
 * UNIFIED CONFIG - Single source of truth for all addresses
 *
 * SKALE Testnet - Chain ID: 2090472038
 * Deployed: Feb 11, 2026
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

export const CHAIN_ID = 2090472038 as const;

// SKALE BITE V2 Precompiles (fixed across all SKALE chains)
export const PRECOMPILES = {
  encryptTE: "0x000000000000000000000000000000000000001c" as Address,
  submitCTX: "0x000000000000000000000000000000000000001b" as Address,
  encryptECIES: "0x000000000000000000000000000000000000001d" as Address,
} as const;

export const CTX_GAS_COST = BigInt("6000000000000000") as bigint; // 0.006 sFUEL

// ============================================================================
// TOKENS
// ============================================================================

export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0x22e20f17CE178b6EA689D6eed46E745843E8418C" as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0xd62bD274e8Ea0f4BDdecd47f908891636498692d" as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x3b0961D397487c006E6e0Ba1624667376c180eD3" as Address,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x7Aa56c756336Cea83439Da502005306B11ba7Dca" as Address,
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
  USDC_WETH: "0xC045D848099Eca36F4dc6a29a8a4EBdb410dDBfE" as Address,
  USDC_WBTC: "0x041DB6A9670c6E7c67F0aB7048919ee172a8a535" as Address,
  USDT_WETH: "0x1EBfe770c3a5F9937E2b92e4463adcA05D6A45f8" as Address,
  USDT_WBTC: "0xB7509874da597218AD2338d7C91346Db64C9dAbD" as Address,
  WETH_WBTC: "0x10b8CD650cADfde9bb8058124328dAe5C17BF49e" as Address,
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
  factory: "0x2452e6e6925f96A45d331AD4deaa5b8eDf0b7276" as Address,
  router: "0xD09c0D61E6E3334c6c1de06793830490C832d435" as Address,
  limitOrderBook: "0x55d3289188f17Eb6002363Ef37fEa9B2686959Aa" as Address,

  // Generic CTX system
  conditionalTransactionBook: "0xe1a3066Bc0Ae57e2b7A8C46599a457f78E178376" as Address,
  ammPriceConditionChecker: "0x0702948949cE00d8683045F0Eab8Ec9478b37e42" as Address,
  ammSwapActionExecutor: "0x9dcd58ea3981222e421786485a2152Ef9fe7F49f" as Address,
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
