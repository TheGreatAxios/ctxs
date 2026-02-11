import { createConfig, http } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// SKALE Testnet
export const skaleTestnetChain = {
  id: 103698795,
  name: 'SKALE Testnet',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: {
    public: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE'],
    },
    default: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com:10032',
    },
  },
  contracts: {},
} as const

export const chains = [skaleTestnetChain] as const

const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'

export const config = createConfig({
  chains: [skaleTestnetChain],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: false,
    }),
    coinbaseWallet({
      appName: 'Rock Paper Scissors',
      appLogoUrl: 'https://example.com/logo.png',
    }),
  ],
  transports: {
    [skaleTestnetChain.id]: http(),
  },
  ssr: true,
})
