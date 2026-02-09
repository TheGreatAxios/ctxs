'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { useContracts } from '@/config/contracts';

export interface ChainSwap {
  swapId: bigint;
  pool: Address;
  submitter: Address;
  active: boolean;
  direction: boolean;
  deadline: bigint;
  nonce: bigint;
}

const SCHEDULED_SWAP_BOOK_ABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'getSwaps',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'submitter', type: 'address' },
          { internalType: 'address', name: 'pool', type: 'address' },
          { internalType: 'bytes', name: 'encryptedAmount', type: 'bytes' },
          { internalType: 'bytes', name: 'encryptedTargetPrice', type: 'bytes' },
          { internalType: 'bool', name: 'direction', type: 'bool' },
          { internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        internalType: 'struct ScheduledSwapBook.ScheduledSwap[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'getActiveSwapCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type SwapResult = {
  submitter: Address;
  pool: Address;
  active: boolean;
  direction: boolean;
  deadline: bigint;
  nonce: bigint;
};

function parseSwaps(
  rawSwaps: readonly ({ status: string; result?: readonly SwapResult[] } | undefined)[] | undefined,
  pools: Address[],
  userAddress: Address,
): ChainSwap[] {
  if (!rawSwaps || !userAddress) return [];

  const parsed: ChainSwap[] = [];

  for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
    const result = rawSwaps[poolIndex];
    if (result?.status === 'success' && result.result) {
      const swaps = result.result;
      for (let i = 0; i < swaps.length; i++) {
        const swap = swaps[i];
        if (swap.submitter.toLowerCase() === userAddress.toLowerCase()) {
          parsed.push({
            swapId: BigInt(i),
            pool: swap.pool,
            submitter: swap.submitter,
            active: swap.active,
            direction: swap.direction,
            deadline: swap.deadline,
            nonce: swap.nonce,
          });
        }
      }
    }
  }

  return parsed;
}

export function useChainOrders(
  userAddress: Address | undefined,
  chainId: number,
  pools?: Address[],
) {
  const contracts = useContracts();

  const poolAddresses: Address[] = pools ?? [
    contracts?.pairs?.USDC_WETH,
    contracts?.pairs?.USDC_WBTC,
    contracts?.pairs?.USDT_WETH,
    contracts?.pairs?.USDT_WBTC,
    contracts?.pairs?.WETH_WBTC,
  ].filter((p): p is Address => p !== undefined);

  const swapContracts = poolAddresses.map(
    (pool) =>
      ({
        address: contracts?.scheduledSwapBook ?? '0x0',
        abi: SCHEDULED_SWAP_BOOK_ABI,
        functionName: 'getSwaps',
        args: [pool],
      }) as const,
  );

  const { data: rawSwaps, refetch: refetchSwaps } = useReadContracts({
    contracts: swapContracts,
    query: {
      enabled: !!userAddress && !!contracts?.scheduledSwapBook,
      refetchInterval: 12_000,
    },
  });

  const swaps = useMemo(
    () => parseSwaps(rawSwaps, poolAddresses, userAddress ?? '0x0'),
    [rawSwaps, poolAddresses, userAddress],
  );

  return {
    orders: swaps,
    isLoading: !rawSwaps && !!userAddress,
    refetch: refetchSwaps,
  };
}
