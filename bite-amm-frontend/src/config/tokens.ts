import type { TokenInfo } from "@/components/dex/TokenSelector";

// SKALE Testnet deployed addresses
// Note: ETH removed - SKALE uses sFUEL/credits for gas with zero fees
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: "0xC8EEde488d7152CED970D9e9621D9330b64Cfd24" as `0x${string}`,
    symbol: "USDC",
    decimals: 6,
    coinbaseId: "usd-coin",
  },
  USDT: {
    address: "0x7433ddb971f6a29e24bac69E2d86396201a7aa78" as `0x${string}`,
    symbol: "USDT",
    decimals: 6,
    coinbaseId: "tether",
  },
  WBTC: {
    address: "0x09C6e0Fe49080e10DF7db8A0c8d64660C4d55D86" as `0x${string}`,
    symbol: "WBTC",
    decimals: 8,
    coinbaseId: "wrapped-bitcoin",
  },
  WETH: {
    address: "0x4B0D38a8bC57e78Eb0Afa5eeA1A1DA30072134ab" as `0x${string}`,
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
