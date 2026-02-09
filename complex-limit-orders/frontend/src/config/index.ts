/**
 * UNIFIED CONFIG - Single source of truth for all addresses
 *
 * SKALE Testnet - Chain ID: 2090472038
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

export const CHAIN_ID = 2090472038 as const;

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
    address: "0xd541EE6977722B329bc15E668C3501473Dd1FEbc" as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0x5D53C8E216cC91B0f0A20FB2f597317276491cD4" as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x9C520Fd0CcFFe4B634a7cD4F93a407dC021B5B69" as Address,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0xad67453Ce29dd7fEbE30f882E17CcFfd9Ed75F2E" as Address,
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
  USDC_WETH: "0x55079Ef8c5A4dFCf6575452D0B7e33B5076099a2" as Address,
  USDC_WBTC: "0xC9935D1Ab54Eb157B66484baA47E866C9F65A871" as Address,
  USDT_WETH: "0xBF399Ac451e91c13aFD73b8dD8A1Af18252f67C4" as Address,
  USDT_WBTC: "0x1B33C331cAa7aa2f061713200ac34B8a0106b896" as Address,
  WETH_WBTC: "0x94d9757E7B1F9f62D259A1b637CBCCFF9142DaF3" as Address,
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
  factory: "0x1066933816E83575A7a79173e55Af62AF4B0E684" as Address,
  router: "0x38d55749A1B2c34A9161ce644F0530329695548d" as Address,
  limitOrderBook: "0xeAbF4cD6B2f9D598fBf1626349c67184f2d64542" as Address,

  // Generic CTX system
  conditionalTransactionBook: "0x198D85E20De3d227fAaFAf319724Bd896dC151BD" as Address,
  ammPriceConditionChecker: "0xC5f78075F0B10f702a7083A156aE8981f24268D9" as Address,
  ammSwapActionExecutor: "0x44117a31802E06d42dbD07BcC5b905669E85E7a1" as Address,
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
