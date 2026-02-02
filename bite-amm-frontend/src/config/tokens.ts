import type { TokenInfo } from "@/components/dex/TokenSelector";

// SKALE Testnet deployed addresses
// Note: ETH removed - SKALE uses sFUEL/credits for gas with zero fees
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xe2eca2c7162cd8447595f40b5b4684a8ec7900f9" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0x5a4a93dc98025a25c4c01a3b7f56161683da4855" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0xacc40e0ca34844aba5cc9d861459851bbc399693" as `0x${string}`,
    symbol: "WBTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x8fe402e969e751296b4d948f20333bde21d05878" as `0x${string}`,
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
