'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
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

  const getBalance = useMemo(() => {
    return (tokenAddress: string): string => {
      const index = tokens.findIndex((t) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (index === -1) return '0';
      const { data } = balances[index];
      if (!data) return '0';
      return formatBigInt(data.value, data.decimals);
    };
  }, [tokens, balances]);

  const getTokenBalance = useMemo(() => {
    return (token: TokenInfo): TokenBalance | null => {
      const index = tokens.findIndex((t) => t.address.toLowerCase() === token.address.toLowerCase());
      if (index === -1) return null;
      const { data } = balances[index];
      if (!data) return null;
      return {
        balance: formatBigInt(data.value, data.decimals),
      };
    };
  }, [tokens, balances]);

  return (
    <TokenBalancesContext.Provider value={{ getBalance, getTokenBalance }}>
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
