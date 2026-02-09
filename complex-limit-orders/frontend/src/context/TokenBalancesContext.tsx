'use client';

import { createContext, useContext, ReactNode, useMemo, useRef, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatBigInt } from '@/lib/utils';

export interface TokenInfo {
  address: `0x${string}`;
  symbol?: string;
  decimals?: number;
  logoURI?: string;
  coinbaseId?: string;
}

export interface TokenBalance {
  balance: string;
  usdValue?: number;
}

interface TokenBalancesContextType {
  getBalance: (tokenAddress: string) => string;
  getTokenBalance: (token: TokenInfo) => TokenBalance | null;
  balancesMap: Map<string, string>;
}

const TokenBalancesContext = createContext<TokenBalancesContextType | undefined>(undefined);

interface TokenBalancesProviderProps {
  children: ReactNode;
  tokens: TokenInfo[];
}

export function TokenBalancesProvider({ children, tokens }: TokenBalancesProviderProps) {
  const { address: walletAddress } = useAccount();

  // Fetch all token balances at provider level (single source of truth)
  const balances = tokens.map((token) =>
    useBalance({
      address: walletAddress as `0x${string}` | undefined,
      token:
        token.address === '0x0000000000000000000000000000000000000000'
          ? undefined
          : token.address,
    })
  );

  // Build a stable map of balances - only recreate when actual balance data changes
  const balancesMap = useMemo(() => {
    const map = new Map<string, string>();
    tokens.forEach((token, index) => {
      const { data } = balances[index];
      if (data) {
        map.set(token.address.toLowerCase(), formatBigInt(data.value, data.decimals));
      } else {
        map.set(token.address.toLowerCase(), '0');
      }
    });
    return map;
  }, [tokens, balances]);

  // Stable reference for getBalance using useCallback
  const getBalance = useCallback(
    (tokenAddress: string): string => {
      return balancesMap.get(tokenAddress.toLowerCase()) ?? '0';
    },
    [balancesMap]
  );

  // Stable reference for getTokenBalance using useCallback
  const getTokenBalance = useCallback(
    (token: TokenInfo): TokenBalance | null => {
      const balance = balancesMap.get(token.address.toLowerCase());
      if (!balance) return null;
      return { balance };
    },
    [balancesMap]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ getBalance, getTokenBalance, balancesMap }),
    [getBalance, getTokenBalance, balancesMap]
  );

  return (
    <TokenBalancesContext.Provider value={contextValue}>
      {children}
    </TokenBalancesContext.Provider>
  );
}

export function useTokenBalances() {
  const context = useContext(TokenBalancesContext);
  if (!context) {
    throw new Error('useTokenBalances must be used within TokenBalancesProvider');
  }
  return context;
}
