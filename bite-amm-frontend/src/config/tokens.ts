import type { TokenInfo } from "@/components/dex/TokenSelector";

// Deployed MockTokens - Feb 2025
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xAf5DA2c52B5DCB3e94F937e424fd132eb92FfeEE" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0xE242b5c5D390b5777437423e9C7B13e56a7dFA59" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x12A04EAa0e41EaDBE1b12693df3ac82cb7b81375" as `0x${string}`,
    symbol: "WBTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x8F29B307B81b64caf8Ab2DB2559DBa2CeD1DF7Cc" as `0x${string}`,
    symbol: "WETH",
    decimals: 18,
    coinbaseId: "weth",
  },
  SKL: {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    symbol: "SKL",
    decimals: 18,
    coinbaseId: "skale",
  },
  ETH: {
    address: "0x0000000000000000000000000000000000000001" as `0x${string}`,
    symbol: "ETH",
    decimals: 18,
    coinbaseId: "ethereum",
  },
};

export const AVAILABLE_TOKENS = Object.values(TOKENS);
