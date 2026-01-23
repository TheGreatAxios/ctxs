import {
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Address, Abi } from 'viem';
import { useState } from 'react';
import SushiSwapV2PairABI from '../../../abi/SushiSwapV2Pair.json';
import SushiSwapV2FactoryABI from '../../../abi/SushiSwapV2Factory.json';

const PAIR_ABI = SushiSwapV2PairABI.abi as Abi;
const FACTORY_ABI = SushiSwapV2FactoryABI.abi as Abi;

export interface PoolReserves {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: bigint;
}

export interface PoolInfo {
  address: Address;
  token0: Address;
  token1: Address;
  reserves: PoolReserves;
  totalSupply: bigint;
}

/**
 * Hook for fetching pool reserves
 */
export function usePoolReserves(pairAddress: Address | undefined) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'getReserves',
    query: {
      enabled: !!pairAddress,
    },
  });
}

/**
 * Hook for fetching pool total supply
 */
export function usePoolTotalSupply(pairAddress: Address | undefined) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!pairAddress,
    },
  });
}

/**
 * Hook for fetching complete pool information
 */
export function usePoolInfo(pairAddress: Address | undefined) {
  const { data: reserves } = usePoolReserves(pairAddress);
  const { data: totalSupply } = usePoolTotalSupply(pairAddress);
  const { data: token0 } = usePoolToken0(pairAddress);
  const { data: token1 } = usePoolToken1(pairAddress);

  return {
    data:
      reserves && token0 && token1
        ? {
            address: pairAddress as Address,
            token0,
            token1,
            reserves: {
              reserve0: (reserves as [bigint, bigint, bigint])[0],
              reserve1: (reserves as [bigint, bigint, bigint])[1],
              blockTimestampLast: (reserves as [bigint, bigint, bigint])[2],
            },
            totalSupply: totalSupply ?? BigInt(0),
          }
        : undefined,
    isLoading: false, // TODO: Add proper loading state
  };
}

/**
 * Hook for fetching token0 address
 */
export function usePoolToken0(pairAddress: Address | undefined) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'token0',
    query: {
      enabled: !!pairAddress,
    },
  });
}

/**
 * Hook for fetching token1 address
 */
export function usePoolToken1(pairAddress: Address | undefined) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'token1',
    query: {
      enabled: !!pairAddress,
    },
  });
}

/**
 * Hook for fetching pair address from factory
 */
export function usePairAddress(
  factoryAddress: Address | undefined,
  tokenA: Address | undefined,
  tokenB: Address | undefined
) {
  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getPair',
    args: tokenA && tokenB ? [tokenA, tokenB] : undefined,
    query: {
      enabled: !!factoryAddress && !!tokenA && !!tokenB,
    },
  });
}

/**
 * Hook for fetching all pairs for a factory
 */
export function useAllPairs(factoryAddress: Address | undefined, allPairsLength: bigint) {
  const pairIndexes = allPairsLength > BigInt(0)
    ? Array.from({ length: Number(allPairsLength) }, (_, i) => BigInt(i))
    : [];

  const { data: pairs } = useReadContracts({
    contracts: pairIndexes.map((index) => ({
      address: factoryAddress as Address,
      abi: FACTORY_ABI,
      functionName: 'allPairs',
      args: [index],
    })),
    query: {
      enabled: !!factoryAddress && allPairsLength > BigInt(0),
    },
  });

  return pairs?.map((result) =>
    result.status === 'success' ? result.result : undefined
  );
}

/**
 * Hook for fetching all pairs length
 */
export function useAllPairsLength(factoryAddress: Address | undefined) {
  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'allPairsLength',
    query: {
      enabled: !!factoryAddress,
    },
  });
}

/**
 * Hook for calculating liquidity amounts
 */
export function useLiquidityAmounts(
  pairAddress: Address | undefined,
  amountA: bigint,
  amountB: bigint
) {
  const { data: reserves } = usePoolReserves(pairAddress);
  const { data: totalSupply } = usePoolTotalSupply(pairAddress);

  if (!reserves || !totalSupply) return null;

  const typedReserves = reserves as readonly [bigint, bigint, bigint];
  const [reserveA, reserveB] = [typedReserves[0], typedReserves[1]];

  if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
    return { liquidity: amountA + amountB };
  }

  const typedTotalSupply = totalSupply as bigint;
  const liquidityA = (amountA * typedTotalSupply) / reserveA;
  const liquidityB = (amountB * typedTotalSupply) / reserveB;
  const liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;

  return { liquidity };
}

/**
 * Hook for adding liquidity
 */
export function useAddLiquidity() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const addLiquidity = async (
    routerAddress: Address,
    tokenA: Address,
    tokenB: Address,
    amountA: bigint,
    amountB: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: Address,
    deadline: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: routerAddress,
        abi: [
          {
            type: 'function',
            name: 'addLiquidity',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'tokenA', type: 'address' },
              { name: 'tokenB', type: 'address' },
              { name: 'amountADesired', type: 'uint256' },
              { name: 'amountBDesired', type: 'uint256' },
              { name: 'amountAMin', type: 'uint256' },
              { name: 'amountBMin', type: 'uint256' },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            outputs: [
              { name: 'amountA', type: 'uint256' },
              { name: 'amountB', type: 'uint256' },
              { name: 'liquidity', type: 'uint256' },
            ],
          },
        ],
        functionName: 'addLiquidity',
        args: [tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, to, deadline],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    addLiquidity,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for removing liquidity
 */
export function useRemoveLiquidity() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const removeLiquidity = async (
    routerAddress: Address,
    tokenA: Address,
    tokenB: Address,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: Address,
    deadline: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: routerAddress,
        abi: [
          {
            type: 'function',
            name: 'removeLiquidity',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'tokenA', type: 'address' },
              { name: 'tokenB', type: 'address' },
              { name: 'liquidity', type: 'uint256' },
              { name: 'amountAMin', type: 'uint256' },
              { name: 'amountBMin', type: 'uint256' },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            outputs: [
              { name: 'amountA', type: 'uint256' },
              { name: 'amountB', type: 'uint256' },
            ],
          },
        ],
        functionName: 'removeLiquidity',
        args: [tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    removeLiquidity,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Calculate price impact for a swap
 */
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feePercent: number = 0.3 // 0.3% default for SushiSwap
): bigint {
  if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) return BigInt(0);

  const amountInWithFee = amountIn * BigInt(Math.floor((1000 - feePercent * 10) * 1000)) / BigInt(1000);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  const amountOut = numerator / denominator;

  return amountOut;
}

/**
 * Calculate optimal amount for adding liquidity
 */
export function calculateOptimalLiquidity(
  amountA: bigint,
  reserveA: bigint,
  reserveB: bigint
): bigint {
  if (reserveA === BigInt(0) || reserveB === BigInt(0)) return amountA;

  return (amountA * reserveB) / reserveA;
}
