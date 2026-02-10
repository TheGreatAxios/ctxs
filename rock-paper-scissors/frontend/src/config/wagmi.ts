import { createConfig, http, type Chain } from 'wagmi'
import { injected } from 'wagmi/connectors'

// SKALE Testnet (base-sepolia)
export const skaleTestnetChain = {
  id: 103698795,
  name: 'SKALE Testnet',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: {
    public: {
      http: [
        'https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE',
      ],
    },
    default: {
      http: [
        'https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com:10032',
    },
  },
  contracts: {},
} as const satisfies Chain

export const config = createConfig({
  chains: [skaleTestnetChain],
  connectors: [injected()],
  transports: {
    [skaleTestnetChain.id]: http(),
  },
  pollingInterval: 250,
})