"use client";

import {
  useAllPairsLength,
  useAllPairs,
  useMultiplePoolsInfo,
  type PoolInfo,
} from "@/lib/hooks/usePool";
import { useMultipleTokenInfo, type TokenInfo } from "@/lib/hooks/useToken";
import { useCoinbasePriceById } from "@/lib/hooks/useCoinbasePrice";
import { getContractForChain, CHAIN_ID } from "@/config/index";
import { formatUnits, type Address } from "viem";
import { useAccount } from "wagmi";

export function PoolList() {
  const { chain } = useAccount();
  const contracts = getContractForChain(chain?.id ?? CHAIN_ID);

  if (!contracts) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Unsupported network</p>
      </div>
    );
  }

  const { data: pairsLength } = useAllPairsLength(contracts.factory);

  const typedPairsLength = pairsLength as bigint | undefined;
  const allPairsLength = (typedPairsLength ?? BigInt(0)) as bigint;
  const { data: pairs } = useAllPairs(contracts.factory, allPairsLength);

  const validPairs = Array.from(
    new Set(pairs?.filter((p): p is `0x${string}` => p !== undefined) ?? []),
  );

  // Batch fetch all pools data
  const { getPoolsInfo, isLoading: isLoadingPools } =
    useMultiplePoolsInfo(validPairs);
  const poolsData = getPoolsInfo(validPairs);

  // Collect unique token addresses for batch fetch
  const uniqueTokens = Array.from(
    new Set(poolsData.flatMap((p) => [p.token0, p.token1])),
  );
  const { getTokenInfo } = useMultipleTokenInfo(uniqueTokens);

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      {!typedPairsLength || typedPairsLength === BigInt(0) ? (
        <div className="text-center py-16">
          <p className="text-stone-600 text-lg font-bold uppercase tracking-widest">
            No pools available yet
          </p>
          <p className="text-stone-400 text-sm mt-3 font-medium">
            Be the first to create a liquidity pool
          </p>
        </div>
      ) : isLoadingPools || poolsData.length === 0 ? (
        <div className="text-center py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-stone-200 rounded-lg w-1/4 mx-auto"></div>
            <div className="h-4 bg-stone-200 rounded-lg w-1/3 mx-auto"></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {poolsData.map((poolInfo) => (
            <PoolCard
              key={poolInfo.address}
              poolInfo={poolInfo}
              pairAddress={poolInfo.address}
              getTokenInfo={getTokenInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PoolCard({
  poolInfo,
  pairAddress,
  getTokenInfo,
}: {
  poolInfo: PoolInfo;
  pairAddress: `0x${string}`;
  getTokenInfo: (address: Address) => TokenInfo | undefined;
}) {
  const token0Info = getTokenInfo(poolInfo.token0);
  const token1Info = getTokenInfo(poolInfo.token1);

  const { data: token0UsdPrice } = useCoinbasePriceById(
    token0Info?.symbol === "ETH"
      ? "ethereum"
      : token0Info?.symbol === "WETH"
        ? "weth"
        : token0Info?.symbol === "USDC" || token0Info?.symbol === "USDC.e"
          ? "usd-coin"
          : token0Info?.symbol === "USDT"
            ? "tether"
            : token0Info?.symbol === "WBTC"
              ? "wrapped-bitcoin"
              : token0Info?.symbol === "SKL"
                ? "skale"
                : null,
  );
  const { data: token1UsdPrice } = useCoinbasePriceById(
    token1Info?.symbol === "ETH"
      ? "ethereum"
      : token1Info?.symbol === "WETH"
        ? "weth"
        : token1Info?.symbol === "USDC" || token1Info?.symbol === "USDC.e"
          ? "usd-coin"
          : token1Info?.symbol === "USDT"
            ? "tether"
            : token1Info?.symbol === "WBTC"
              ? "wrapped-bitcoin"
              : token1Info?.symbol === "SKL"
                ? "skale"
                : null,
  );

  const liquidityUsd = calculateLiquidity(
    poolInfo.reserves.reserve0,
    poolInfo.reserves.reserve1,
    token0Info?.decimals ?? 18,
    token1Info?.decimals ?? 18,
    token0UsdPrice ?? null,
    token1UsdPrice ?? null,
  );

  const token0Symbol = token0Info?.symbol ?? poolInfo.token0.slice(0, 6);
  const token1Symbol = token1Info?.symbol ?? poolInfo.token1.slice(0, 6);

  const r0 = parseFloat(
    formatUnits(poolInfo.reserves.reserve0, token0Info?.decimals ?? 18),
  );
  const r1 = parseFloat(
    formatUnits(poolInfo.reserves.reserve1, token1Info?.decimals ?? 18),
  );

  const isValidR0 = !isNaN(r0) && isFinite(r0);
  const isValidR1 = !isNaN(r1) && isFinite(r1);

  return (
    <div className="bg-white border-2 border-black brutalist-shadow rounded-lg p-3 hover:translate-x-1 hover:shadow-[3px_3px_0_0_#000] transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* Pair Name & Address */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-stone-900 tracking-tight uppercase truncate">
            {token0Symbol}/{token1Symbol}
          </h3>
          <p className="text-stone-400 text-[10px] font-mono uppercase tracking-wider truncate">
            {pairAddress.slice(0, 6)}...{pairAddress.slice(-4)}
          </p>
        </div>

        {/* Fee Tier */}
        <div className="flex-shrink-0 text-center min-w-[60px]">
          <p className="text-sm font-black text-stone-900">0.3%</p>
          <p className="text-stone-400 text-[10px] font-bold uppercase">Fee</p>
        </div>

        {/* Reserves */}
        <div className="flex-shrink-0 text-right min-w-[120px]">
          <p className="text-sm font-bold text-stone-900">
            {isValidR0 ? formatCompact(r0) : "-"} {token0Symbol}
          </p>
          <p className="text-sm font-bold text-stone-900">
            {isValidR1 ? formatCompact(r1) : "-"} {token1Symbol}
          </p>
        </div>

        {/* TVL */}
        <div className="text-right flex-shrink-0 min-w-[80px]">
          <p className="text-lg font-black text-stone-900">
            {liquidityUsd > 0 ? `$${formatCompact(liquidityUsd)}` : "-"}
          </p>
          <p className="text-stone-400 text-[10px] font-bold uppercase">TVL</p>
        </div>

        {/* Add LP Button */}
        <a
          href={`/pools/${pairAddress}`}
          className="flex-shrink-0 bg-accent hover:bg-accent/90 border-2 border-black px-3 py-2 rounded-lg font-black text-xs uppercase tracking-wider brutalist-shadow transition-all hover:translate-y-0.5 active:shadow-none active:translate-y-1"
        >
          Add LP
        </a>
      </div>
    </div>
  );
}

function formatCompact(num: number): string {
  if (!isFinite(num)) return "-";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.0001) return num.toFixed(4);
  return num.toFixed(6);
}

function calculateLiquidity(
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number,
  decimals1: number,
  price0: number | null,
  price1: number | null,
): number {
  const r0 = Number(formatUnits(reserve0, decimals0));
  const r1 = Number(formatUnits(reserve1, decimals1));

  if (!isFinite(r0) || !isFinite(r1)) return 0;
  if (
    price0 !== null &&
    price1 !== null &&
    isFinite(price0) &&
    isFinite(price1)
  ) {
    const usd0 = r0 * price0;
    const usd1 = r1 * price1;
    return Math.round(isFinite(usd0 + usd1) ? usd0 + usd1 : 0);
  }

  if (price0 !== null && isFinite(price0)) {
    return Math.round(isFinite(r0 * price0 * 2) ? r0 * price0 * 2 : 0);
  }
  if (price1 !== null && isFinite(price1)) {
    return Math.round(isFinite(r1 * price1 * 2) ? r1 * price1 * 2 : 0);
  }

  return 0;
}
