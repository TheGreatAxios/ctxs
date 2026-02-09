'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface SwapAmounts {
  fromToken: string | null;
  toToken: string | null;
  fromAmount: string;
  toAmount: string;
}

interface SwapAmountsContextType {
  amounts: SwapAmounts;
  setAmounts: (amounts: Partial<SwapAmounts>) => void;
  clearAmounts: () => void;
  getFromAmount: (tokenAddress: string) => string;
  getToAmount: (tokenAddress: string) => string;
}

const SwapAmountsContext = createContext<SwapAmountsContextType | undefined>(undefined);

const DEFAULT_AMOUNTS: SwapAmounts = {
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
};

export function SwapAmountsProvider({ children }: { children: ReactNode }) {
  const [amounts, setAmountsState] = useState<SwapAmounts>(DEFAULT_AMOUNTS);

  const setAmounts = useCallback((updates: Partial<SwapAmounts>) => {
    setAmountsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearAmounts = useCallback(() => {
    setAmountsState(DEFAULT_AMOUNTS);
  }, []);

  const getFromAmount = useCallback(
    (tokenAddress: string) => {
      return amounts.fromToken === tokenAddress ? amounts.fromAmount : '';
    },
    [amounts.fromToken, amounts.fromAmount],
  );

  const getToAmount = useCallback(
    (tokenAddress: string) => {
      return amounts.toToken === tokenAddress ? amounts.toAmount : '';
    },
    [amounts.toToken, amounts.toAmount],
  );

  return (
    <SwapAmountsContext.Provider
      value={{ amounts, setAmounts, clearAmounts, getFromAmount, getToAmount }}
    >
      {children}
    </SwapAmountsContext.Provider>
  );
}

export function useSwapAmounts() {
  const context = useContext(SwapAmountsContext);
  if (!context) {
    throw new Error('useSwapAmounts must be used within SwapAmountsProvider');
  }
  return context;
}

// Hook to get cached amount for a specific token (for use in token selector)
export function useCachedAmount(tokenAddress: string, type: 'from' | 'to' = 'from') {
  const { amounts } = useSwapAmounts();
  if (type === 'from') {
    return amounts.fromToken === tokenAddress ? amounts.fromAmount : '';
  }
  return amounts.toToken === tokenAddress ? amounts.toAmount : '';
}
