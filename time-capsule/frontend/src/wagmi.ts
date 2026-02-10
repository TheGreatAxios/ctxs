import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Chain } from "viem";
import { http } from "viem";

// SKALE Testnet (base-sepolia)
// Fast block times with 250ms polling for rapid updates
export const skaleTestnetChain = {
  id: 103698795,
  name: "SKALE Testnet",
  nativeCurrency: { name: "sFUEL", symbol: "sFUEL", decimals: 18 },
  rpcUrls: {
    public: {
      http: [
        "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE",
      ],
    },
    default: {
      http: [
        "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "SKALE Explorer",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com:10032",
    },
  },
  contracts: {},
} as const satisfies Chain;

// Module-level singleton - created once on import
export let config: ReturnType<typeof getDefaultConfig>;

export function initializeConfig() {
  if (!config) {
    config = getDefaultConfig({
      appName: "Nostradamus Registry",
      projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || "default",
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
