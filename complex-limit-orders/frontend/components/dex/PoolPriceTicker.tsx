"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount } from "wagmi";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  useAllPairsLength,
  useAllPairs,
  useMultiplePoolsInfo,
} from "@/lib/hooks/usePool";
import { useMultipleTokenInfo } from "@/lib/hooks/useToken";
import { getContractForChain } from "@/config/contracts";
import { formatUnits } from "viem";
import { useTokenPrices, useTokenPriceByAddress } from "@/lib/hooks/useTokenPrices";

interface PoolPrice {
  address: string;
  token0Symbol: string;
  token1Symbol: string;
  priceUsd: number;
  priceDisplay: string;
  change24h: number;
  poolRatio: number;
  hasUsdPrice: boolean;
  marketPrice: number | null;
  priceDiffPercent: number | null;
  isUndervalued: boolean;
  isOvervalued: boolean;
  tvlUsd: number;
  reserve0Display: string;
  reserve1Display: string;
}

export function PoolPriceTicker() {
  const { chain } = useAccount();
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;

  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(
    new Map(),
  );

  // Fetch all pools
  const { data: pairsLength } = useAllPairsLength(factoryAddress);
  const allPairsLength = (pairsLength as bigint | undefined) ?? BigInt(0);
  const { data: pairs } = useAllPairs(factoryAddress, allPairsLength);
  const validPairs = Array.from(
    new Set(pairs?.filter((p): p is `0x${string}` => p !== undefined) ?? []),
  );
  const { getPoolsInfo } = useMultiplePoolsInfo(validPairs);
  const poolsData = getPoolsInfo(validPairs);

  // Get unique tokens and fetch prices
  const uniqueTokens = Array.from(
    new Set(poolsData.flatMap((p) => [p.token0, p.token1])),
  );
  const { getTokenInfo } = useMultipleTokenInfo(uniqueTokens);
  const { prices: symbolPrices } = useTokenPrices();

  // Build address -> price map using token info and symbol-based prices
  const pricesMap = useMemo(() => {
    const map = new Map<string, number>();

    uniqueTokens.forEach((address) => {
      const tokenInfo = getTokenInfo(address);
      if (tokenInfo?.symbol) {
        const price = symbolPrices[tokenInfo.symbol];
        if (price) {
          map.set(address.toLowerCase(), price);
        }
      }
    });

    // Debug logging
    console.log("=== PRICE MAP DEBUG ===");
    console.log("Unique tokens:", uniqueTokens);
    console.log("Symbol prices:", symbolPrices);
    console.log("Price map entries:", Array.from(map.entries()));
    console.log("=======================");
    return map;
  }, [uniqueTokens, getTokenInfo, symbolPrices]);

  // Calculate pool prices
  const poolPrices = useMemo(() => {
    const prices: PoolPrice[] = [];

    poolsData.forEach((pool) => {
      const token0Info = getTokenInfo(pool.token0);
      const token1Info = getTokenInfo(pool.token1);

      if (!token0Info || !token1Info) return;

      const reserve0 = pool.reserves.reserve0;
      const reserve1 = pool.reserves.reserve1;

      if (reserve0 === 0n || reserve1 === 0n) return;

      // Calculate pool price (token0 in terms of token1)
      const poolRatio =
        Number(formatUnits(reserve1, token1Info.decimals)) /
        Number(formatUnits(reserve0, token0Info.decimals));

      // Get USD prices from address-based price map
      const token0UsdPrice = pricesMap.get(pool.token0.toLowerCase()) ?? null;
      const token1UsdPrice = pricesMap.get(pool.token1.toLowerCase()) ?? null;

      // Calculate USD price for token0
      let priceUsd = 0;
      if (token1UsdPrice) {
        priceUsd = poolRatio * token1UsdPrice;
      } else if (token0UsdPrice) {
        priceUsd = token0UsdPrice;
      }

      // If no USD price available, show pool ratio only
      const hasUsdPrice = priceUsd > 0;

      // Calculate market price and arbitrage opportunity
      const marketPrice = token0UsdPrice ?? null;
      let priceDiffPercent: number | null = null;
      let isUndervalued = false;
      let isOvervalued = false;

      if (hasUsdPrice && marketPrice && marketPrice > 0) {
        priceDiffPercent = ((priceUsd - marketPrice) / marketPrice) * 100;
        isUndervalued = priceDiffPercent < -5; // More than 5% below market
        isOvervalued = priceDiffPercent > 5; // More than 5% above market
      }

      // Debug log for each pool
      console.log(`Pool ${token0Info.symbol}/${token1Info.symbol}:`, {
        poolRatio,
        token0UsdPrice,
        token1UsdPrice,
        priceUsd,
        marketPrice,
        priceDiffPercent,
        isUndervalued,
        isOvervalued,
        hasUsdPrice,
      });

      // Calculate 24h change (only if we have USD price)
      const previousPrice = previousPrices.get(pool.address);
      const change24h =
        hasUsdPrice && previousPrice
          ? ((priceUsd - previousPrice) / previousPrice) * 100
          : 0;

      // Format price display
      let priceDisplay: string;
      if (!hasUsdPrice) {
        // Show pool ratio instead (token1 per token0)
        priceDisplay =
          poolRatio < 0.001
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

      // Calculate TVL and format reserves
      const reserve0Formatted = Number(formatUnits(reserve0, token0Info.decimals));
      const reserve1Formatted = Number(formatUnits(reserve1, token1Info.decimals));

      let tvlUsd = 0;
      if (token0UsdPrice && token1UsdPrice) {
        tvlUsd = (reserve0Formatted * token0UsdPrice) + (reserve1Formatted * token1UsdPrice);
      } else if (token0UsdPrice) {
        tvlUsd = reserve0Formatted * token0UsdPrice * 2;
      } else if (token1UsdPrice) {
        tvlUsd = reserve1Formatted * token1UsdPrice * 2;
      }

      const formatReserve = (val: number) => {
        if (val === 0) return "0";
        if (val >= 1000000) return (val / 1000000).toFixed(2) + "M";
        if (val >= 1000) return (val / 1000).toFixed(2) + "K";
        if (val >= 1) return val.toFixed(2);
        if (val >= 0.0001) return val.toFixed(4);
        return val.toFixed(6);
      };

      prices.push({
        address: pool.address,
        token0Symbol: token0Info.symbol,
        token1Symbol: token1Info.symbol,
        priceUsd: hasUsdPrice ? priceUsd : poolRatio,
        priceDisplay: priceDisplay,
        change24h,
        poolRatio,
        hasUsdPrice,
        marketPrice,
        priceDiffPercent,
        isUndervalued,
        isOvervalued,
        tvlUsd,
        reserve0Display: formatReserve(reserve0Formatted),
        reserve1Display: formatReserve(reserve1Formatted),
      });
    });

    console.log("=== FINAL POOL PRICES ===");
    prices.forEach((p) => {
      console.log(`${p.token0Symbol}/${p.token1Symbol}:`, {
        display: p.priceDisplay,
        hasUsd: p.hasUsdPrice,
        market: p.marketPrice,
        diff: p.priceDiffPercent,
        undervalued: p.isUndervalued,
        overvalued: p.isOvervalued,
      });
    });
    console.log("=========================");

    return prices.sort((a, b) => b.priceUsd - a.priceUsd);
  }, [poolsData, getTokenInfo, pricesMap, previousPrices]);

  // Update previous prices periodically (outside of useMemo)
  useEffect(() => {
    if (poolPrices.length === 0) return;

    const interval = setInterval(() => {
      setPreviousPrices(
        new Map(poolPrices.map((p) => [p.address, p.priceUsd])),
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [poolPrices]);

  if (!factoryAddress) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          Switch to SKALE Testnet
        </p>
      </div>
    );
  }

  if (poolPrices.length === 0) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          {allPairsLength > 0n ? "Loading prices..." : "No pools available"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-lg font-black text-stone-900 uppercase tracking-widest">
          Live Prices
        </h2>
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
            className={`bg-stone-50 border-2 rounded-xl p-3 hover:border-primary transition-colors ${
              pool.isUndervalued
                ? "border-red-400 bg-red-50"
                : pool.isOvervalued
                  ? "border-green-400 bg-green-50"
                  : "border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-stone-900 text-sm uppercase">
                    {pool.token0Symbol}
                  </span>
                  <span className="text-xs text-stone-400">/</span>
                  <span className="font-bold text-stone-600 text-sm uppercase">
                    {pool.token1Symbol}
                  </span>

                  {/* Arbitrage Alert Badge */}
                  {pool.isUndervalued && (
                    <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {Math.abs(pool.priceDiffPercent!).toFixed(0)}% BELOW
                      MARKET
                    </span>
                  )}
                  {pool.isOvervalued && (
                    <span className="text-[10px] font-black bg-green-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {Math.abs(pool.priceDiffPercent!).toFixed(0)}% ABOVE
                      MARKET
                    </span>
                  )}

                  {pool.change24h !== 0 &&
                    !pool.isUndervalued &&
                    !pool.isOvervalued && (
                      <span
                        className={`text-xs font-bold flex items-center gap-0.5 ${
                          pool.change24h >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {pool.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(pool.change24h).toFixed(2)}%
                      </span>
                    )}
                </div>

                {/* Market Price Comparison */}
                {pool.hasUsdPrice && pool.marketPrice && (
                  <div className="mt-1 text-[10px] font-semibold text-stone-500">
                    Market: ${pool.marketPrice.toLocaleString()} | Pool:{" "}
                    {pool.priceDisplay}
                  </div>
                )}

                {/* TVL */}
                <p className="font-black text-stone-900 text-sm">
                  {pool.tvlUsd > 0
                    ? `$${pool.tvlUsd >= 1000
                        ? (pool.tvlUsd / 1000).toFixed(1) + 'K'
                        : pool.tvlUsd.toFixed(2)}`
                    : 'N/A'}
                </p>
                <p className="text-[10px] font-semibold text-stone-500">
                  TVL
                </p>

                {/* Low liquidity warning */}
                {pool.tvlUsd > 0 && pool.tvlUsd < 100000 && (
                  <p className="text-[9px] text-amber-600 font-bold">
                    ⚠️ Low liquidity
                  </p>
                )}
              </div>

              <div className="text-right">
                {/* Price */}
                <p className="font-black text-stone-900 text-sm">
                  {pool.priceDisplay}
                </p>

                {/* Reserves */}
                <div className="mt-1 text-[10px] text-stone-600">
                  <div>{pool.reserve0Display} {pool.token0Symbol}</div>
                  <div>{pool.reserve1Display} {pool.token1Symbol}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
