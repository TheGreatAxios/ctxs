import type { TokenInfo } from "@/components/dex/TokenSelector";

// Deployed MockTokens - Feb 2025
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xE2a2099e5b05463671b5Bf04dB6742e5dEa8BbDE" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0xF3274034069E00Ab66335b0C01508f9e3bB0b020" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0xEe353B841F85aC9cB3E285FC0FF5dA435B7d2E33" as `0x${string}`,
    symbol: "WBTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0xAC3B95CCB3339d3668C16C552F62F8Da31d5f6a0" as `0x${string}`,
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
