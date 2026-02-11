// Buffer polyfill for @skalenetwork/bite
import { Buffer } from 'buffer'
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, skaleTestnetChain } from './config/wagmi'
import App from './App'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00f5ff',
            accentColorForeground: 'black',
            borderRadius: 'large',
            fontStack: 'system',
          })}
          initialChain={skaleTestnetChain}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
