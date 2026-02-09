import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { useMemo } from 'react';

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

const FACTORY_ABI = [
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
] as const;

/**
 * Calculate output amount for a single hop using constant product formula
 * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
 */
function calculateHopOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) return 0n;

  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;

  return numerator / denominator;
}

/**
 * Hook to calculate quote for multi-hop routes
 * Returns the estimated output amount for a given path and input amount
 */
export function useSwapQuote(
  factoryAddress?: Address,
  path?: Address[],
  amountIn?: bigint
): { quote: bigint | null; isLoading: boolean } {
  const enabled = !!factoryAddress && !!path && path.length >= 2 && !!amountIn;

  // We need to fetch reserves for each hop in the path
  // For simplicity, we'll fetch all pair data in one batch using useReadContract
  const pairAddresses = useMemo(() => {
    if (!enabled) return [];

    const pairs: Address[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      pairs.push(factoryAddress!);
    }
    return pairs;
  }, [enabled, factoryAddress, path]);

  // For each hop, we need the pair address and reserves
  // We'll use a simple approach: fetch reserves for each hop
  const hopQueries = useMemo(() => {
    if (!enabled) return [];

    const queries = [];
    for (let i = 0; i < path.length - 1; i++) {
      queries.push({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair' as const,
        args: [path[i], path[i + 1]] as const,
      });
    }
    return queries;
  }, [enabled, factoryAddress, path]);

  // Fetch all pair addresses
  const pairResults = hopQueries.map(query => {
    return useReadContract({
      ...query,
      query: { enabled },
    });
  });

  // Fetch reserves for each pair
  const reservesQueries = pairResults.map((result, i) => {
    return useReadContract({
      address: result.data as Address,
      abi: PAIR_ABI,
      functionName: 'getReserves',
      query: {
        enabled: enabled && !!result.data && result.data !== '0x0000000000000000000000000000000000000000',
      },
    });
  });

  const isLoading = pairResults.some(r => r.isLoading) || reservesQueries.some(r => r.isLoading);

  const quote = useMemo(() => {
    if (!enabled || isLoading) return null;

    let currentAmount = amountIn!;

    for (let i = 0; i < path.length - 1; i++) {
      const pairAddr = pairResults[i].data as Address | undefined;
      const reserves = reservesQueries[i].data as readonly [bigint, bigint, bigint] | undefined;

      if (!pairAddr || pairAddr === '0x0000000000000000000000000000000000000000' || !reserves) {
        return null;
      }

      const [reserve0, reserve1] = reserves;
      const tokenA = path[i];
      const tokenB = path[i + 1];

      // Determine which token is token0 in the pair
      const isToken0Input = tokenA.toLowerCase() < tokenB.toLowerCase();
      const reserveIn = isToken0Input ? reserve0 : reserve1;
      const reserveOut = isToken0Input ? reserve1 : reserve0;

      if (reserveIn === 0n || reserveOut === 0n) {
        return null;
      }

      currentAmount = calculateHopOutput(currentAmount, reserveIn, reserveOut);
      if (currentAmount === 0n) {
        return null;
      }
    }

    return currentAmount;
  }, [enabled, amountIn, path, pairResults, reservesQueries, isLoading]);

  return { quote, isLoading };
}

/**
 * Helper function to calculate quote synchronously (useful for unit tests)
 */
export function calculateQuoteSync(
  path: Address[],
  amountIn: bigint,
  getReservesFn: (tokenA: Address, tokenB: Address) => readonly [bigint, bigint] | null
): bigint | null {
  let currentAmount = amountIn;

  for (let i = 0; i < path.length - 1; i++) {
    const tokenA = path[i];
    const tokenB = path[i + 1];
    const reserves = getReservesFn(tokenA, tokenB);

    if (!reserves) return null;

    const [reserve0, reserve1] = reserves;
    const isToken0Input = tokenA.toLowerCase() < tokenB.toLowerCase();
    const reserveIn = isToken0Input ? reserve0 : reserve1;
    const reserveOut = isToken0Input ? reserve1 : reserve0;

    if (reserveIn === 0n || reserveOut === 0n) return null;

    currentAmount = calculateHopOutput(currentAmount, reserveIn, reserveOut);
    if (currentAmount === 0n) return null;
  }

  return currentAmount;
}
