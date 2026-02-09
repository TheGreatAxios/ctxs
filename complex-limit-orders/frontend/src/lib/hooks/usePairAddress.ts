import { useReadContract } from 'wagmi';

// Minimal Factory ABI for getPair
const GET_PAIR_ABI = [
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
 * Hook to look up a trading pair address from the factory
 * @param factoryAddress - The factory contract address
 * @param tokenA - First token address
 * @param tokenB - Second token address
 * @returns The pair address or undefined if not found
 */
export function usePairAddress(
  factoryAddress?: `0x${string}`,
  tokenA?: `0x${string}`,
  tokenB?: `0x${string}`
) {
  const enabled = !!factoryAddress && !!tokenA && !!tokenB;

  const { data, isLoading, error } = useReadContract({
    address: factoryAddress,
    abi: GET_PAIR_ABI,
    functionName: 'getPair',
    args: tokenA && tokenB ? [tokenA, tokenB] : undefined,
    query: {
      enabled,
      staleTime: 60_000, // Cache for 1 minute
    },
  });

  return {
    pairAddress: data as `0x${string}` | undefined,
    isLoading,
    error,
  };
}
