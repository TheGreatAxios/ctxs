"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ReactNode, useState } from "react";
import { config } from "@/wagmi";
import { TokenPricesProvider } from "@/lib/hooks/useTokenPrices";
import { SwapAmountsProvider } from "@/context/SwapAmountsContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TokenPricesProvider>
          <SwapAmountsProvider>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </SwapAmountsProvider>
        </TokenPricesProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
