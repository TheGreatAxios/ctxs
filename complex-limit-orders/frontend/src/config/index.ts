/**
 * UNIFIED CONFIG - Single source of truth for all addresses
 *
 * SKALE Testnet - Chain ID: 2090472038
 * Deployed: Feb 2026
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
    address: "0x6a971D20050B01F61ad7F01975862Fe8307CbD70" as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0xc7B8baBCf3EFee8232326BBB1f6d70E848202Fd5" as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x1aCe30D4d6db097D4943B322FeB6678Fd485b8D4" as Address,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x7bb4533a19AdaBEea20a031a6539a7FfDD92bfa7" as Address,
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
  USDC_WETH: "0x6b824D9258559f7aEe08a1A660fFF3E2fE50F998" as Address,
  USDC_WBTC: "0x23cB1aF49df2633CcF05F56Bb4819D507CFbA816" as Address,
  USDT_WETH: "0x6DCfB3f58a35a4cf9D4a9a1Fc8122f71c6F73fa9" as Address,
  USDT_WBTC: "0xE6559C73F066435fE6585c5c54D29cDB210d6026" as Address,
  WETH_WBTC: "0x51CE5F8c5fE10E5fCE88f09B71a248a416c95C99" as Address,
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
  factory: "0x275FB869d44c60Cf0164497A1418e739896B1CEF" as Address,
  router: "0xBf54f55B610bE6CC6E4C9e8297D7Ed1229763f05" as Address,
  limitOrderBook: "0xefBBc70De8d19085bf2Ba6828541c6A429F2eB25" as Address,

  // Generic CTX system
  conditionalTransactionBook: "0x228AA4304b11e2EFfc37c7c4869F23aD13bE64da" as Address,
  ammPriceConditionChecker: "0xB0A62b172482eBe67fFd7B9fE0901dcC012E936B" as Address,
  ammSwapActionExecutor: "0x5675039d81519e6c5D3529e5485b4c237E49d7c9" as Address,
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
