import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// SKALE Testnet (base-sepolia)
export const skaleTestnetChain = {
  id: 2090472038,
  name: 'SKALE Testnet',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: {
    public: { http: ['https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit'] },
    default: { http: ['https://base-sepolia-testnet.skalenodes.com/v1/miniature-live-tabit'] },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com:10012',
    },
  },
  contracts: {},
} as const;

// Legacy: SKALE CTX Chain (kept for reference)
export const skaleCtxChain = {
  id: 3564619,
  name: 'SKALE CTX Chain',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: {
    public: { http: ['https://base-sepolia.skalenodes.com/chains/miniature-live-tabit'] },
    default: { http: ['https://base-sepolia.skalenodes.com/chains/miniature-live-tabit'] },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com:10012',
    },
  },
  contracts: {},
} as const;

export const config = getDefaultConfig({
  appName: 'BITE-AMM',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default',
  chains: [skaleTestnetChain],
  ssr: true,
});
