import { createConfig, http } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// SKALE BITE V2 Sandbox
export const skaleTestnetChain = {
  id: 2090472038,
  name: 'SKALE BITE V2 Sandbox',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: {
    public: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox'],
    },
    default: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox'],
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

const projectId = 'ff97f5a8a4116c18b104556e8132dc37'

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
    [skaleTestnetChain.id]: http('https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox'),
  },
  ssr: true,
})
