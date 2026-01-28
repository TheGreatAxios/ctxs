import { useQuery } from "@tanstack/react-query";
import { TOKENS } from "@/config/tokens";
import type { Address } from "viem";

// Coinbase API base URL
const COINBASE_API = "https://api.coinbase.com/v2";

// Token symbol to Coinbase ID mapping
const SYMBOL_TO_COINBASE_ID: Record<string, string> = {
  SKL: "skale",
  USDC: "usd-coin",
  USDT: "tether",
  WBTC: "wrapped-bitcoin",
  WETH: "weth",
  ETH: "ethereum",
};

// Cache time: 30 seconds, stale time: 15 seconds
const CACHE_TIME = 30_000;
const STALE_TIME = 15_000;

interface PriceData {
  currency: string;
  rates: Record<string, string>;
}

interface CoinbaseResponse {
  data: PriceData;
}

/**
 * Fetches the current USD price of a token from Coinbase
 * @param coinbaseId - Coinbase currency ID (e.g., 'ethereum', 'usd-coin')
 * @returns Price in USD or null if not found
 */
async function fetchCoinbasePriceById(
  coinbaseId: string,
): Promise<number | null> {
  try {
    const response = await fetch(
      `${COINBASE_API}/exchange-rates?currency=${coinbaseId}`,
    );

    if (!response.ok) return null;

    const data: CoinbaseResponse = await response.json();
    // Coinbase returns rates as { "USD": "3456.78", ... }
    const usdRate = data.data.rates?.USD;

    if (!usdRate) return null;

    const price = parseFloat(usdRate);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

/**
 * Hook to fetch token price from Coinbase by coinbase ID
 * @param coinbaseId - Coinbase currency ID (e.g., 'ethereum', 'usd-coin')
 */
export function useCoinbasePriceById(coinbaseId?: string | null) {
  return useQuery({
    queryKey: ["coinbase-price", coinbaseId],
    queryFn: () => fetchCoinbasePriceById(coinbaseId ?? ""),
    enabled: !!coinbaseId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
  });
}

/**
 * Hook to fetch token price by token address
 * Looks up the token in TOKENS config to get the coinbase ID
 * @param tokenAddress - Token contract address
 */
export function useTokenPrice(tokenAddress?: Address | null) {
  // Find token by address (case-insensitive)
  const token = Object.values(TOKENS).find(
    (t) => t.address.toLowerCase() === (tokenAddress ?? "").toLowerCase(),
  );

  const coinbaseId = token?.coinbaseId;
  return useCoinbasePriceById(coinbaseId ?? null);
}

/**
 * Legacy hook for symbol-based lookup (kept for backward compatibility)
 * @deprecated Use useTokenPrice or useCoinbasePriceById instead
 * @param symbol - Token symbol (e.g., 'ETH', 'USDC')
 */
export function useCoinbasePrice(symbol?: string) {
  const coinbaseId = symbol
    ? SYMBOL_TO_COINBASE_ID[symbol.toUpperCase()]
    : undefined;
  return useCoinbasePriceById(coinbaseId ?? null);
}

/**
 * Hook to fetch multiple token prices by addresses
 * @param tokenAddresses - Array of token contract addresses
 */
export function useTokenPrices(tokenAddresses: Address[]) {
  const prices = tokenAddresses.map((addr) => useTokenPrice(addr));
  return prices;
}
