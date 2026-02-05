'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { useContracts } from '@/config/contracts';

export interface ChainOrder {
  orderId: bigint;
  pool: Address;
  maker: Address;
  active: boolean;
  // Contract direction: true = token0→token1, false = token1→token0
  direction: boolean;
  deadline: bigint;
  nonce: bigint;
  gasDeducted: boolean;
}

const LIMIT_ORDER_BOOK_ABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'getOrderCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'getOrder',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'pool', type: 'address' },
          { internalType: 'bytes', name: 'encryptedTargetPrice', type: 'bytes' },
          { internalType: 'bytes', name: 'encryptedAmount', type: 'bytes' },
          { internalType: 'bool', name: 'direction', type: 'bool' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'bool', name: 'gasDeducted', type: 'bool' },
          { internalType: 'bytes32', name: 'orderHash', type: 'bytes32' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'struct LimitOrderStructs.LimitOrder',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type OrderResult = {
  maker: Address;
  pool: Address;
  active: boolean;
  direction: boolean;
  deadline: bigint;
  nonce: bigint;
  gasDeducted: boolean;
};

function buildOrderContracts(
  pools: Address[],
  orderCounts: readonly ({ result?: bigint } | undefined)[],
  lobAddress: Address,
): Array<{
  address: Address;
  abi: typeof LIMIT_ORDER_BOOK_ABI;
  functionName: 'getOrder';
  args: [Address, bigint];
}> {
  const contracts: Array<{
    address: Address;
    abi: typeof LIMIT_ORDER_BOOK_ABI;
    functionName: 'getOrder';
    args: [Address, bigint];
  }> = [];

  for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
    const countValue = orderCounts[poolIndex]?.result;
    if (!countValue) continue;

    const pool = pools[poolIndex];
    for (let i = 0; i < Number(countValue); i++) {
      contracts.push({
        address: lobAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'getOrder',
        args: [pool, BigInt(i)],
      });
    }
  }

  return contracts;
}

function parseOrders(
  rawOrders: readonly ({ status: string; result?: OrderResult } | undefined)[] | undefined,
  orderCounts: readonly ({ result?: bigint } | undefined)[],
  pools: Address[],
  userAddress: Address,
): ChainOrder[] {
  if (!rawOrders || !userAddress) return [];

  const parsed: ChainOrder[] = [];
  let globalIndex = 0;

  for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
    const countValue = orderCounts[poolIndex]?.result;
    if (!countValue) continue;

    const pool = pools[poolIndex];
    for (let i = 0; i < Number(countValue); i++) {
      const result = rawOrders[globalIndex];
      if (result?.status === 'success' && result.result) {
        const order = result.result;
        if (order.maker.toLowerCase() === userAddress.toLowerCase()) {
          parsed.push({
            orderId: BigInt(i),
            pool,
            maker: order.maker,
            active: order.active,
            direction: order.direction,
            deadline: order.deadline,
            nonce: order.nonce,
            gasDeducted: order.gasDeducted,
          });
        }
      }
      globalIndex++;
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

  const countContracts = poolAddresses.map(
    (pool) =>
      ({
        address: contracts?.limitOrderBook ?? '0x0',
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'getOrderCount',
        args: [pool],
      }) as const,
  );

  const { data: orderCounts, refetch: refetchCounts } = useReadContracts({
    contracts: countContracts,
    query: {
      enabled: !!userAddress && !!contracts?.limitOrderBook,
      refetchInterval: 12_000,
    },
  });

  const orderContracts = useMemo(
    () =>
      buildOrderContracts(
        poolAddresses,
        orderCounts ?? [],
        contracts?.limitOrderBook ?? '0x0',
      ),
    [poolAddresses, orderCounts, contracts?.limitOrderBook],
  );

  const { data: rawOrders, refetch: refetchOrders } = useReadContracts({
    contracts: orderContracts,
    query: {
      enabled:
        !!userAddress &&
        !!contracts?.limitOrderBook &&
        orderContracts.length > 0,
      refetchInterval: 12_000,
    },
  });

  const orders = useMemo(
    () => parseOrders(rawOrders, orderCounts ?? [], poolAddresses, userAddress ?? '0x0'),
    [rawOrders, orderCounts, poolAddresses, userAddress],
  );

  return {
    orders,
    isLoading:
      (!orderCounts && !!userAddress) ||
      (!rawOrders && orderContracts.length > 0),
    refetch: () => {
      refetchCounts();
      refetchOrders();
    },
  };
}
