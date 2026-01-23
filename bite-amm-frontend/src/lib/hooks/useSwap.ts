import {
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import type { Address } from 'viem';
import { useState } from 'react';
import SushiSwapV2PairABI from '../../../abi/SushiSwapV2Pair.json';

const PAIR_ABI = SushiSwapV2PairABI.abi;

// Helper function to calculate output amount using constant product formula
// amountOut = amountIn * reserveOut / (reserveIn + amountIn)
// Fee is 0.3% so multiply by 997/1000
export function calculateAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error('Invalid reserves');
  }
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

export interface SwapParams {
  pairAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  recipient: Address;
}

/**
 * Hook for executing direct pair swaps
 * Uses SushiSwapV2Pair.swap() directly
 */
export function useSwap() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const swap = async (params: SwapParams): Promise<void> => {
    setIsPending(true);

    try {
      // Step 1: Read reserves and token addresses
      const [reserve0, reserve1] = await Promise.all([
        fetchReserves(params.pairAddress),
        fetchToken0(params.pairAddress),
        fetchToken1(params.pairAddress),
      ]);

      const reserves = await fetchReserves(params.pairAddress);
      const token0 = await fetchToken0(params.pairAddress);
      const token1 = await fetchToken1(params.pairAddress);

      // Step 2: Determine token order and calculate output
      const isToken0In = params.tokenIn.toLowerCase() === token0.toLowerCase();

      const reserveIn = isToken0In ? reserves.reserve0 : reserves.reserve1;
      const reserveOut = isToken0In ? reserves.reserve1 : reserves.reserve0;

      const amountOut = calculateAmountOut(params.amountIn, reserveIn, reserveOut);

      if (amountOut < params.amountOutMin) {
        throw new Error(`Insufficient output: expected ${params.amountOutMin}, got ${amountOut}`);
      }

      // Step 3: Call swap with calculated amounts
      const amount0Out = isToken0In ? 0n : amountOut;
      const amount1Out = isToken0In ? amountOut : 0n;

      writeContract({
        address: params.pairAddress,
        abi: PAIR_ABI,
        functionName: 'swap',
        args: [amount0Out, amount1Out, params.recipient, '0x' as `0x${string}`],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    swap,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

// Helper functions for fetching pair data
async function fetchReserves(pairAddress: Address): Promise<{ reserve0: bigint; reserve1: bigint }> {
  const response = await fetch(window.location.origin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: pairAddress,
          data: '0x0902f1ac', // getReserves() selector
        },
        'latest',
      ],
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(`Failed to fetch reserves: ${result.error.message}`);
  }

  const data = result.result as `0x${string}`;
  const reserve0 = BigInt(`0x${data.slice(26, 66)}`);
  const reserve1 = BigInt(`0x${data.slice(66, 130)}`);
  return { reserve0, reserve1 };
}

async function fetchToken0(pairAddress: Address): Promise<Address> {
  const response = await fetch(window.location.origin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: pairAddress,
          data: '0x0dfe1681', // token0() selector
        },
        'latest',
      ],
    }),
  });

  const result = await response.json();
  return result.result as Address;
}

async function fetchToken1(pairAddress: Address): Promise<Address> {
  const response = await fetch(window.location.origin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: pairAddress,
          data: '0xd21220a7', // token1() selector
        },
        'latest',
      ],
    }),
  });

  const result = await response.json();
  return result.result as Address;
}

/**
 * Hook for approving token spending
 */
export function useApprove() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const approve = async (
    tokenAddress: Address,
    spender: Address,
    amount: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: tokenAddress,
        abi: [
          {
            type: 'function',
            name: 'approve',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ type: 'bool' }],
          },
        ],
        functionName: 'approve',
        args: [spender, amount],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    approve,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for revoking token approval
 */
export function useRevokeApproval() {
  const { approve, isPending, isConfirming, receipt, txHash } = useApprove();

  const revoke = async (
    tokenAddress: Address,
    spender: Address
  ): Promise<void> => {
    return approve(tokenAddress, spender, BigInt(0));
  };

  return {
    revoke,
    isPending,
    isConfirming,
    receipt,
    txHash,
  };
}
