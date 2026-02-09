'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TOKENS } from '@/config/tokens';

// CoinGecko free public API (no API key needed)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache time: 60 seconds, stale time: 30 seconds
const CACHE_TIME = 60_000;
const STALE_TIME = 30_000;

interface CoinGeckoPrice {
  usd: number;
}

interface CoinGeckoResponse {
  [key: string]: CoinGeckoPrice | undefined;
}

// Token symbol to CoinGecko ID mapping
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  SKL: 'skale',
  USDC: 'usd-coin',
  USDT: 'tether',
  WBTC: 'wrapped-bitcoin',
  WETH: 'weth',
  ETH: 'ethereum',
};

/**
 * Fetches all token prices from CoinGecko in a single request
 * Uses the /simple/price endpoint which is free and requires no API key
 */
async function fetchAllTokenPrices(): Promise<Record<string, number>> {
  try {
    // Get unique CoinGecko IDs for all available tokens
    const coinIdsMap: Record<string, string> = {};
    for (const token of Object.values(TOKENS)) {
      const symbol = token.symbol;
      if (symbol) {
        const coinId = SYMBOL_TO_COINGECKO_ID[symbol];
        if (coinId) {
          coinIdsMap[coinId] = symbol;
        }
      }
    }

    const coinIds = Object.keys(coinIdsMap);
    if (coinIds.length === 0) return {};

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status, response.statusText);
      return {};
    }

    const data: CoinGeckoResponse = await response.json();

    // Map CoinGecko IDs back to token symbols
    const prices: Record<string, number> = {};
    for (const [coinId, symbol] of Object.entries(coinIdsMap)) {
      const priceData = data[coinId];
      if (priceData?.usd && typeof priceData.usd === 'number') {
        prices[symbol] = priceData.usd;
      }
    }

    console.log('Fetched prices from CoinGecko:', prices);
    return prices;
  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    return {};
  }
}

interface TokenPricesContextValue {
  prices: Record<string, number>;
  isLoading: boolean;
  error: unknown | null;
  refetch: () => void;
}

const TokenPricesContext = createContext<TokenPricesContextValue | undefined>(undefined);

export function TokenPricesProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['token-prices'],
    queryFn: fetchAllTokenPrices,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
    refetchOnWindowFocus: true,
  });

  const prices = data ?? {};

  return (
    <TokenPricesContext.Provider value={{ prices, isLoading, error, refetch: refetch }}>
      {children}
    </TokenPricesContext.Provider>
  );
}

export function useTokenPrices() {
  const context = useContext(TokenPricesContext);
  if (!context) {
    throw new Error('useTokenPrices must be used within TokenPricesProvider');
  }
  return context;
}

/**
 * Get the USD price for a specific token by symbol
 */
export function useTokenPrice(symbol?: string | null): number | undefined {
  const { prices } = useTokenPrices();
  return symbol ? prices[symbol] : undefined;
}

/**
 * Get the USD price for a token by its address
 */
export function useTokenPriceByAddress(address?: `0x${string}` | null): number | undefined {
  const { prices } = useTokenPrices();

  if (!address) return undefined;

  // ETH/native token
  if (address === '0x0000000000000000000000000000000000000000') {
    return prices['ETH'];
  }

  // Find token by address
  const token = Object.values(TOKENS).find(
    t => t.address.toLowerCase() === address.toLowerCase()
  );

  return token?.symbol ? prices[token.symbol] : undefined;
}
