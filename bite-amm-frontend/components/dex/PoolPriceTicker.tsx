'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAllPairsLength, useAllPairs, useMultiplePoolsInfo } from '@/lib/hooks/usePool';
import { useMultipleTokenInfo } from '@/lib/hooks/useToken';
import { getContractForChain } from '@/config/contracts';
import { formatUnits } from 'viem';
import { useCoinbasePrice } from '@/lib/hooks/useCoinbasePrice';

interface PoolPrice {
  address: string;
  token0Symbol: string;
  token1Symbol: string;
  priceUsd: number;
  priceDisplay: string;
  change24h: number;
}

export function PoolPriceTicker() {
  const { chain } = useAccount();
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;

  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());

  // Coinbase price map (empty until we have correct token addresses)
  const pricesMap = useMemo(() => new Map<string, number>(), []);

  // Fetch all pools
  const { data: pairsLength } = useAllPairsLength(factoryAddress);
  const allPairsLength = (pairsLength as bigint | undefined) ?? BigInt(0);
  const { data: pairs } = useAllPairs(factoryAddress, allPairsLength);
  const validPairs = Array.from(
    new Set(pairs?.filter((p): p is `0x${string}` => p !== undefined) ?? []),
  );
  const { getPoolsInfo } = useMultiplePoolsInfo(validPairs);
  const poolsData = getPoolsInfo(validPairs);

  // Log pool addresses for debugging
  useEffect(() => {
    console.log('=== POOLS DEBUG ===');
    console.log('Number of pools:', poolsData.length);
    poolsData.forEach(pool => {
      console.log(`Pool: ${pool.address}`);
      console.log(`  token0: ${pool.token0}`);
      console.log(`  token1: ${pool.token1}`);
      console.log(`  reserves: ${pool.reserves.reserve0.toString()} / ${pool.reserves.reserve1.toString()}`);
    });
    console.log('==================');
  }, [poolsData]);

  // Get token info
  const uniqueTokens = Array.from(
    new Set(poolsData.flatMap((p) => [p.token0, p.token1])),
  );
  const { getTokenInfo } = useMultipleTokenInfo(uniqueTokens);

  // Map token addresses to coinbase IDs for known tokens
  // TODO: Make this dynamic or pull from token metadata
  const tokenCoinbaseIds: Record<string, string> = {
    // These should be the actual SKALE Testnet addresses
    // Will be populated once we know the deployed addresses
  };

  // Calculate pool prices
  const poolPrices = useMemo(() => {
    const prices: PoolPrice[] = [];

    poolsData.forEach(pool => {
      const token0Info = getTokenInfo(pool.token0);
      const token1Info = getTokenInfo(pool.token1);

      if (!token0Info || !token1Info) return;

      const reserve0 = pool.reserves.reserve0;
      const reserve1 = pool.reserves.reserve1;

      if (reserve0 === 0n || reserve1 === 0n) return;

      // Calculate pool price (token0 in terms of token1)
      const poolRatio = Number(formatUnits(reserve1, token1Info.decimals)) /
                       Number(formatUnits(reserve0, token0Info.decimals));

      // Get USD prices from coinbase map
      const token0UsdPrice = tokenCoinbaseIds[pool.token0.toLowerCase()] ? pricesMap.get(tokenCoinbaseIds[pool.token0.toLowerCase()]) : null;
      const token1UsdPrice = tokenCoinbaseIds[pool.token1.toLowerCase()] ? pricesMap.get(tokenCoinbaseIds[pool.token1.toLowerCase()]) : null;

      // Calculate USD price for token0
      let priceUsd = 0;
      if (token1UsdPrice) {
        priceUsd = poolRatio * token1UsdPrice;
      } else if (token0UsdPrice) {
        priceUsd = token0UsdPrice * poolRatio;
      }

      // If no USD price available, show pool ratio only
      const hasUsdPrice = priceUsd > 0;

      // Calculate 24h change (only if we have USD price)
      const previousPrice = previousPrices.get(pool.address);
      const change24h = (hasUsdPrice && previousPrice)
        ? ((priceUsd - previousPrice) / previousPrice) * 100
        : 0;

      // Format price display
      let priceDisplay: string;
      if (!hasUsdPrice) {
        // Show pool ratio instead (token1 per token0)
        priceDisplay = poolRatio < 0.001
          ? poolRatio.toExponential(2)
          : poolRatio < 1
            ? poolRatio.toFixed(6)
            : poolRatio.toFixed(4);
      } else if (priceUsd >= 1000) {
        priceDisplay = `$${priceUsd.toFixed(2)}`;
      } else if (priceUsd >= 1) {
        priceDisplay = `$${priceUsd.toFixed(4)}`;
      } else if (priceUsd >= 0.01) {
        priceDisplay = `$${priceUsd.toFixed(6)}`;
      } else {
        priceDisplay = `$${priceUsd.toFixed(8)}`;
      }

      prices.push({
        address: pool.address,
        token0Symbol: token0Info.symbol,
        token1Symbol: token1Info.symbol,
        priceUsd: hasUsdPrice ? priceUsd : poolRatio,
        priceDisplay: priceDisplay,
        change24h,
      });
    });

    return prices.sort((a, b) => b.priceUsd - a.priceUsd);
  }, [poolsData, getTokenInfo, pricesMap, previousPrices, tokenCoinbaseIds]);

  // Update previous prices periodically (outside of useMemo)
  useEffect(() => {
    if (poolPrices.length === 0) return;

    const interval = setInterval(() => {
      setPreviousPrices(new Map(poolPrices.map(p => [p.address, p.priceUsd])));
    }, 30000);

    return () => clearInterval(interval);
  }, [poolPrices]);

  if (!factoryAddress) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">Switch to SKALE Testnet</p>
      </div>
    );
  }

  if (poolPrices.length === 0) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          {allPairsLength > 0n ? 'Loading prices...' : 'No pools available'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-lg font-black text-stone-900 uppercase tracking-widest">Live Prices</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-stone-500">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {poolPrices.map((pool) => (
          <div
            key={pool.address}
            className="bg-stone-50 border-2 border-stone-200 rounded-xl p-3 hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-stone-900 text-sm uppercase">
                    {pool.token0Symbol}
                  </span>
                  <span className="text-xs text-stone-400">/</span>
                  <span className="font-bold text-stone-600 text-sm uppercase">
                    {pool.token1Symbol}
                  </span>
                  {pool.change24h !== 0 && (
                    <span className={`text-xs font-bold flex items-center gap-0.5 ${
                      pool.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pool.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(pool.change24h).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="font-black text-stone-900 text-lg">
                  {pool.priceDisplay}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
