"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatBigInt } from "@/lib/utils";
import type { Address } from "viem";

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

const TokenBalancesContext = createContext<
  TokenBalancesContextType | undefined
>(undefined);

interface TokenBalancesProviderProps {
  children: ReactNode;
  tokens: TokenInfo[];
}

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function TokenBalancesProvider({
  children,
  tokens,
}: TokenBalancesProviderProps) {
  const { address: walletAddress } = useAccount();

  // Memoize contracts array to prevent infinite re-renders
  const contracts = useMemo(
    () =>
      tokens.map((token) => ({
        address: token.address as Address,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf" as const,
        args: [walletAddress as Address],
      })),
    [tokens, walletAddress],
  );

  // Batch fetch all token balances using useReadContracts
  const { data: balancesData } = useReadContracts({
    contracts,
    query: {
      enabled: !!walletAddress && tokens.length > 0,
    },
  });

  // Build a stable map of balances
  const balancesMap = useMemo(() => {
    const map = new Map<string, string>();
    tokens.forEach((token, index) => {
      const result = balancesData?.[index];
      if (result?.status === "success") {
        map.set(
          token.address.toLowerCase(),
          formatBigInt(result.result as bigint, token.decimals ?? 18),
        );
      } else {
        map.set(token.address.toLowerCase(), "0");
      }
    });
    return map;
  }, [tokens, balancesData]);

  // Stable reference for getBalance using useCallback
  const getBalance = useCallback(
    (tokenAddress: string): string => {
      return balancesMap.get(tokenAddress.toLowerCase()) ?? "0";
    },
    [balancesMap],
  );

  // Stable reference for getTokenBalance using useCallback
  const getTokenBalance = useCallback(
    (token: TokenInfo): TokenBalance | null => {
      const balance = balancesMap.get(token.address.toLowerCase());
      if (!balance) return null;
      return { balance };
    },
    [balancesMap],
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ getBalance, getTokenBalance, balancesMap }),
    [getBalance, getTokenBalance, balancesMap],
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
    throw new Error(
      "useTokenBalances must be used within TokenBalancesProvider",
    );
  }
  return context;
}
