import { useState, useEffect, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { useLiquidPools, type LiquidPool } from './useLiquidPools';
import { usePairAddress } from './usePairAddress';

const PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: 'reserve0', type: 'uint112' },
      { internalType: 'uint112', name: 'reserve1', type: 'uint112' },
      { internalType: 'uint32', name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface Route {
  path: Address[];
  hops: number;
  estimatedOutput: bigint;
}

const MAX_HOPS = 4;

function buildTokenGraph(pools: LiquidPool[]): Map<Address, Set<Address>> {
  const graph = new Map<Address, Set<Address>>();

  for (const pool of pools) {
    if (!graph.has(pool.token0)) {
      graph.set(pool.token0, new Set());
    }
    if (!graph.has(pool.token1)) {
      graph.set(pool.token1, new Set());
    }
    graph.get(pool.token0)!.add(pool.token1);
    graph.get(pool.token1)!.add(pool.token0);
  }

  return graph;
}

function bfsAllPaths(
  from: Address,
  to: Address,
  graph: Map<Address, Set<Address>>,
  maxHops: number
): Address[][] {
  const paths: Address[][] = [];
  const queue: { node: Address; path: Address[] }[] = [{ node: from, path: [from] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (node === to) {
      paths.push(path);
      continue;
    }

    if (path.length - 1 >= maxHops) continue;

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      const key = `${neighbor}-${path.length}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          node: neighbor,
          path: [...path, neighbor],
        });
      }
    }
  }

  return paths;
}

async function estimateOutputForPath(
  path: Address[],
  amountIn: bigint,
  getReservesFn: (tokenA: Address, tokenB: Address) => Promise<readonly [bigint, bigint] | null>
): Promise<bigint> {
  let currentAmount = amountIn;

  for (let i = 0; i < path.length - 1; i++) {
    const tokenA = path[i];
    const tokenB = path[i + 1];
    const reserves = await getReservesFn(tokenA, tokenB);

    if (!reserves || reserves[0] === 0n || reserves[1] === 0n) {
      return 0n;
    }

    const [reserve0, reserve1] = reserves;
    const isToken0Input = tokenA.toLowerCase() < tokenB.toLowerCase();

    const reserveIn = isToken0Input ? reserve0 : reserve1;
    const reserveOut = isToken0Input ? reserve1 : reserve0;

    const amountInWithFee = currentAmount * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;

    currentAmount = numerator / denominator;
    if (currentAmount === 0n) {
      return 0n;
    }
  }

  return currentAmount;
}

interface PoolReserves {
  tokenA: Address;
  tokenB: Address;
  reserves: readonly [bigint, bigint];
}

export function useRoute(
  factoryAddress?: Address,
  fromToken?: Address,
  toToken?: Address,
  amountIn?: bigint
): { route: Route | null; isLoading: boolean } {
  const publicClient = usePublicClient();
  const [route, setRoute] = useState<Route | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { pools, isLoading: isLoadingPools } = useLiquidPools(factoryAddress, 10);
  const { pairAddress } = usePairAddress(factoryAddress, fromToken, toToken);

  useEffect(() => {
    if (!fromToken || !toToken || !amountIn || !publicClient || isLoadingPools) {
      setRoute(null);
      setIsSearching(false);
      return;
    }

    if (fromToken.toLowerCase() === toToken.toLowerCase()) {
      setRoute(null);
      setIsSearching(false);
      return;
    }

    const findRoute = async () => {
      setIsSearching(true);
      const hasDirectPair = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';

      const reservesCache = new Map<string, readonly [bigint, bigint]>();

      const getReservesFn = async (tokenA: Address, tokenB: Address): Promise<readonly [bigint, bigint] | null> => {
        const key = [tokenA, tokenB].sort().join('-');
        if (reservesCache.has(key)) {
          return reservesCache.get(key)!;
        }

        try {
          const factoryAbi = [
            {
              inputs: [
                { name: 'tokenA', type: 'address' },
                { name: 'tokenB', type: 'address' },
              ],
              name: 'getPair',
              outputs: [{ name: 'pair', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
          ];

          const pairAddr = await publicClient.readContract({
            address: factoryAddress!,
            abi: factoryAbi,
            functionName: 'getPair',
            args: [tokenA, tokenB],
          }) as Address;

          if (!pairAddr || pairAddr === '0x0000000000000000000000000000000000000000') {
            return null;
          }

          const reserves = await publicClient.readContract({
            address: pairAddr,
            abi: PAIR_ABI,
            functionName: 'getReserves',
          }) as unknown as readonly [bigint, bigint, bigint];

          reservesCache.set(key, [reserves[0], reserves[1]]);
          return [reserves[0], reserves[1]];
        } catch {
          return null;
        }
      };

      // Check direct pair first
      if (hasDirectPair) {
        const reserves = await getReservesFn(fromToken, toToken);
        if (reserves && reserves[0] !== 0n && reserves[1] !== 0n) {
          const output = await estimateOutputForPath([fromToken, toToken], amountIn, getReservesFn);
          if (output > 0n) {
            setRoute({ path: [fromToken, toToken], hops: 1, estimatedOutput: output });
            setIsSearching(false);
            return;
          }
        }
      }

      // BFS for multi-hop routes
      const graph = buildTokenGraph(pools);
      const allPaths = bfsAllPaths(fromToken, toToken, graph, MAX_HOPS);

      let bestRoute: Route | null = null;
      for (const path of allPaths) {
        const output = await estimateOutputForPath(path, amountIn, getReservesFn);
        if (output === 0n) continue;

        if (!bestRoute || output > bestRoute.estimatedOutput) {
          bestRoute = { path, hops: path.length - 1, estimatedOutput: output };
        }
      }

      setRoute(bestRoute);
      setIsSearching(false);
    };

    findRoute();
  }, [fromToken, toToken, amountIn, publicClient, pools, isLoadingPools, pairAddress, factoryAddress]);

  return { route, isLoading: isSearching || isLoadingPools };
}
