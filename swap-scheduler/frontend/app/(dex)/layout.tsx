'use client';

import { Navbar } from '@/components/layout/Navbar';
import { SwapAmountsProvider } from '@/context/SwapAmountsContext';
import { TokenPricesProvider } from '@/lib/hooks/useTokenPrices';

export default function DexLayout({ children }: { children: React.ReactNode }) {
  return (
    <SwapAmountsProvider>
      <TokenPricesProvider>
        <div className="min-h-screen bg-stone-100">
          <Navbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </TokenPricesProvider>
    </SwapAmountsProvider>
  );
}
