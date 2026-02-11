import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Chain } from "viem";
import type { Config } from "wagmi";
import { http } from "viem";

// SKALE Testnet (base-sepolia - miniature-live-tabit)
// Fast block times with 250ms polling for rapid updates
export const skaleTestnetChain = {
  id: 2090472038,
  name: "SKALE Testnet",
  nativeCurrency: { name: "sFUEL", symbol: "sFUEL", decimals: 18 },
  rpcUrls: {
    public: {
      http: [
        "https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit",
      ],
    },
    default: {
      http: [
        "https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "SKALE Explorer",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com",
    },
  },
  contracts: {},
} as const satisfies Chain;

// Legacy: SKALE CTX Chain (kept for reference)
export const skaleCtxChain = {
  id: 3564619,
  name: "SKALE CTX Chain",
  nativeCurrency: { name: "sFUEL", symbol: "sFUEL", decimals: 18 },
  rpcUrls: {
    public: {
      http: ["https://base-sepolia.skalenodes.com/chains/miniature-live-tabit"],
    },
    default: {
      http: ["https://base-sepolia.skalenodes.com/chains/miniature-live-tabit"],
    },
  },
  blockExplorers: {
    default: {
      name: "SKALE Explorer",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com:10012",
    },
  },
  contracts: {},
} as const;

// Module-level singleton - created once on import
// eslint-disable-next-line import/no-mutable-exports
export let config: Config;

export function initializeConfig(): Config {
  if (!config) {
    config = getDefaultConfig({
      appName: "BiteSwap",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "default",
      chains: [skaleTestnetChain],
      ssr: true,
      transports: {
        [skaleTestnetChain.id]: http(),
      },
      // 250ms polling for rapid transaction confirmation
      pollingInterval: 250,
    });
  }
  return config;
}

// Initialize immediately to prevent multiple WalletConnect instances
initializeConfig();
