import type { TokenInfo } from "@/components/dex/TokenSelector";

// Deployed MockTokens - Feb 2025
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xd66368d1881091b44356a18a29d4529aaefe1e91" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0x7a881a4e39827e69c552dca070f4d8dc36bb3e05" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0xd09aa46abc7d505e9edf77df39c2e45d5893dc60" as `0x${string}`,
    symbol: "WBTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x1f7fc775e166a9cf7159da03c993c026064bfc86" as `0x${string}`,
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
