'use client';

import { useAllPairsLength, useAllPairs, usePoolInfo, type PoolInfo } from '@/lib/hooks/usePool';
import { FACTORY_ADDRESS } from '@/config/contracts';
import { formatUnits } from 'viem';

export function PoolList() {
  const { data: pairsLength } = useAllPairsLength(FACTORY_ADDRESS);

  const typedPairsLength = pairsLength as bigint | undefined;
  const pairIndexes = typedPairsLength && typedPairsLength > BigInt(0)
    ? Array.from({ length: Number(typedPairsLength) }, (_, i) => BigInt(i))
    : [];

  const allPairsLength = (typedPairsLength ?? BigInt(0)) as bigint;
  const { data: pairs } = useAllPairs(FACTORY_ADDRESS, allPairsLength) as unknown as { data: (`0x${string}` | undefined)[] | undefined };

  const validPairs = pairs?.filter((p): p is `0x${string}` => p !== undefined) ?? [];

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Liquidity Pools</h1>
        <p className="text-muted-foreground">
          Browse and manage liquidity pools on BITE-AMM
        </p>
      </div>

      {!typedPairsLength || typedPairsLength === BigInt(0) ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No pools available yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            Be the first to create a liquidity pool
          </p>
        </div>
      ) : validPairs.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {validPairs.map((pairAddress) => (
            <PoolListItem key={pairAddress} pairAddress={pairAddress} />
          ))}
        </div>
      )}
    </div>
  );
}

function PoolListItem({ pairAddress }: { pairAddress: `0x${string}` }) {
  const { data: poolInfo } = usePoolInfo(pairAddress);

  if (!poolInfo) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <PoolCard poolInfo={poolInfo as PoolInfo} pairAddress={pairAddress} />
  );
}

function PoolCard({ poolInfo, pairAddress }: { poolInfo: PoolInfo; pairAddress: `0x${string}` }) {
  const liquidityUsd = calculateLiquidity(poolInfo.reserves.reserve0, poolInfo.reserves.reserve1);

  return (
    <a
      href={`/pools/${pairAddress}`}
      className="block bg-card border border-border rounded-lg p-5 hover:border-primary transition-colors duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-1">
            {getTokenSymbol(poolInfo.token0)} / {getTokenSymbol(poolInfo.token1)}
          </h3>

          <div className="flex gap-6 mt-3 text-sm">
            <div>
              <p className="text-muted-foreground">Reserve 0</p>
              <p className="text-foreground font-medium">
                {formatUnits(poolInfo.reserves.reserve0, 18)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Reserve 1</p>
              <p className="text-foreground font-medium">
                {formatUnits(poolInfo.reserves.reserve1, 18)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Supply</p>
              <p className="text-foreground font-medium">
                {formatUnits(poolInfo.totalSupply, 18)} LP
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            ${liquidityUsd.toLocaleString()}
          </p>
          <p className="text-muted-foreground text-sm mt-1">Total Liquidity</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pool Address</span>
          <span className="text-foreground font-mono text-xs">
            {pairAddress.slice(0, 6)}...{pairAddress.slice(-4)}
          </span>
        </div>
      </div>
    </a>
  );
}

function getTokenSymbol(tokenAddress: `0x${string}`): string {
  const tokenMap: Record<string, string> = {
    '0x0000000000000000000000000000000000000000': 'ETH',
  };
  return tokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 6);
}

function calculateLiquidity(reserve0: bigint, reserve1: bigint): number {
  const r0 = Number(formatUnits(reserve0, 18));
  const r1 = Number(formatUnits(reserve1, 18));
  return Math.round(r0 + r1);
}
