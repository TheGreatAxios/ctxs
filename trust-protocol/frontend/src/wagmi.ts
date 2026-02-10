import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Chain } from "viem";
import type { Config } from "wagmi";
import { http } from "viem";

export const skaleTestnetChain = {
  id: 103698795,
  name: "SKALE Testnet",
  nativeCurrency: { name: "sFUEL", symbol: "sFUEL", decimals: 18 },
  rpcUrls: {
    public: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE"],
    },
    default: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE"],
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

export let config: Config;

export function initializeConfig(): Config {
  if (!config) {
    config = getDefaultConfig({
      appName: "Trust Protocol",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "default",
      chains: [skaleTestnetChain],
      ssr: true,
      transports: {
        [skaleTestnetChain.id]: http(),
      },
      pollingInterval: 250,
    });
  }
  return config;
}

initializeConfig();
