import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { useState, useEffect } from 'react';

const FACTORY_ABI = [
  {
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPairs',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface LiquidPool {
  address: Address;
  token0: Address;
  token1: Address;
  liquidity: bigint;
}

const CACHE_DURATION = 2000; // 2 seconds

interface PoolData {
  address: Address;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
  liquidity: bigint;
}

export function useLiquidPools(factoryAddress?: Address, topN: number = 10) {
  const [pools, setPools] = useState<LiquidPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!factoryAddress || !publicClient) return;

    const now = Date.now();
    if (now - lastFetch < CACHE_DURATION && hasFetched) {
      return;
    }

    const fetchPools = async () => {
      setIsLoading(true);
      try {
        // Check if factory exists by calling allPairsLength
        const allPairsLength = await publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'allPairsLength',
        }) as bigint;

        // If result is 0n and no error, factory exists but has no pairs
        // If result is undefined/null, factory doesn't exist - handled by catch
        if (!allPairsLength) {
          setPools([]);
          setLastFetch(now);
          setHasFetched(true);
          setIsLoading(false);
          return;
        }

        const length = Number(allPairsLength);
        const poolPromises: Promise<PoolData | null>[] = [];

        for (let i = 0; i < length; i++) {
          poolPromises.push(
            (async () => {
              try {
                const pairAddress = await publicClient.readContract({
                  address: factoryAddress,
                  abi: FACTORY_ABI,
                  functionName: 'allPairs',
                  args: [BigInt(i)],
                }) as Address;

                const [reserves, token0, token1] = await Promise.all([
                  publicClient.readContract({
                    address: pairAddress,
                    abi: PAIR_ABI,
                    functionName: 'getReserves',
                  }) as unknown as readonly [bigint, bigint, bigint],
                  publicClient.readContract({
                    address: pairAddress,
                    abi: PAIR_ABI,
                    functionName: 'token0',
                  }) as unknown as Address,
                  publicClient.readContract({
                    address: pairAddress,
                    abi: PAIR_ABI,
                    functionName: 'token1',
                  }) as unknown as Address,
                ]);

                const [reserve0, reserve1] = reserves;
                const liquidity = reserve0 * reserve1;

                return {
                  address: pairAddress,
                  token0,
                  token1,
                  reserve0,
                  reserve1,
                  liquidity,
                };
              } catch {
                return null;
              }
            })()
          );
        }

        const results = await Promise.all(poolPromises);
        const validPools = results.filter((p): p is PoolData => p !== null);

        validPools.sort((a, b) => {
          if (b.liquidity !== a.liquidity) {
            return b.liquidity > a.liquidity ? 1 : -1;
          }
          return a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1;
        });

        const topPools: LiquidPool[] = validPools.slice(0, topN).map(p => ({
          address: p.address,
          token0: p.token0,
          token1: p.token1,
          liquidity: p.liquidity,
        }));

        setPools(topPools);
        setLastFetch(now);
        setHasFetched(true);
      } catch (error) {
        // Silently handle contract not found or no function error
        // This happens when factory isn't deployed on the current network
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('no data') || errorMsg.includes('0x')) {
          // Factory not deployed or has no pairs - return empty
          setPools([]);
          setLastFetch(now);
        } else {
          console.error('Error fetching liquid pools:', error);
        }
        setHasFetched(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [factoryAddress, publicClient, lastFetch, topN]);

  return { pools, isLoading };
}
