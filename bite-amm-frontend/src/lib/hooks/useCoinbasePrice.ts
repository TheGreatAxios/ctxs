import { useQuery } from '@tanstack/react-query';

// Coinbase API base URL
const COINBASE_API = 'https://api.coinbase.com/v2';

// Token symbol to Coinbase ID mapping
const SYMBOL_TO_COINBASE_ID: Record<string, string> = {
  SKL: 'skale',
  USDC: 'usd-coin',
  USDT: 'tether',
  WBTC: 'wrapped-bitcoin',
  WETH: 'weth',
  ETH: 'ethereum',
};

// Cache time: 30 seconds, stale time: 15 seconds
const CACHE_TIME = 30_000;
const STALE_TIME = 15_000;

interface PriceData {
  base: string;
  currency: string;
  amount: string;
}

interface CoinbaseResponse {
  data: PriceData;
}

/**
 * Fetches the current USD price of a token from Coinbase
 * @param symbol - Token symbol (e.g., 'ETH', 'USDC')
 * @returns Price in USD or null if not found
 */
async function fetchCoinbasePrice(symbol: string): Promise<number | null> {
  const coinbaseId = SYMBOL_TO_COINBASE_ID[symbol.toUpperCase()];
  if (!coinbaseId) return null;

  try {
    const response = await fetch(
      `${COINBASE_API}/exchange-rates?currency=${coinbaseId}`
    );

    if (!response.ok) return null;

    const data: CoinbaseResponse = await response.json();
    // Coinbase returns rates as strings, get USD rate
    const usdRate = data.data.amount;
    return parseFloat(usdRate);
  } catch {
    return null;
  }
}

/**
 * Hook to fetch token price from Coinbase
 * @param symbol - Token symbol (e.g., 'ETH', 'USDC')
 */
export function useCoinbasePrice(symbol?: string) {
  return useQuery({
    queryKey: ['coinbase-price', symbol],
    queryFn: () => fetchCoinbasePrice(symbol ?? ''),
    enabled: !!symbol,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
  });
}

/**
 * Hook to fetch multiple token prices from Coinbase
 * @param symbols - Array of token symbols
 */
export function useCoinbasePrices(symbols: string[]) {
  const queries = symbols.map((symbol) => ({
    queryKey: ['coinbase-price', symbol],
    queryFn: () => fetchCoinbasePrice(symbol),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  }));

  const results = useQuery({
    queryKey: ['coinbase-prices', symbols],
    queryFn: async () => {
      const prices = await Promise.all(
        symbols.map((symbol) => fetchCoinbasePrice(symbol))
      );
      return prices.reduce((acc, price, i) => {
        acc[symbols[i]] = price;
        return acc;
      }, {} as Record<string, number | null>);
    },
    enabled: symbols.length > 0,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  return results;
}
