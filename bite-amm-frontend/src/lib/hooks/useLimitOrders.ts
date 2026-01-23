import {
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Address } from 'viem';
import { toBytes, toHex } from 'viem';
import { useState } from 'react';
import { encryptTE } from '../bite/encryption';
import ConfidentialLimitOrderBookABI from '../../../abi/ConfidentialLimitOrderBook.json';

const LIMIT_ORDER_BOOK_ABI = ConfidentialLimitOrderBookABI.abi;

export interface LimitOrderParams {
  pool: Address;
  targetPrice: bigint;
  amount: bigint;
  direction: boolean; // true = buy, false = sell
  deadline: bigint;
  userPublicKey: { x: `0x${string}`; y: `0x${string}` };
}

export interface EncryptedLimitOrderParams extends Omit<LimitOrderParams, 'targetPrice' | 'amount'> {
  encryptedTargetPrice: `0x${string}`;
  encryptedAmount: `0x${string}`;
}

export interface CreateOrderResult {
  orderId: bigint;
  txHash: `0x${string}`;
}

/**
 * Hook for creating encrypted limit orders
 * Note: Contract handles CTX submission internally via checkOrders()
 */
export function useCreateLimitOrder() {
  const [isPending, setIsPending] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [orderId, setOrderId] = useState<bigint | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const createOrder = async (
    params: LimitOrderParams,
    rpcUrl: string,
    contractAddress: Address,
    gasDepositAmount?: bigint
  ): Promise<CreateOrderResult> => {
    setIsEncrypting(true);

    try {
      // Encrypt sensitive data using threshold encryption
      const [encryptedTargetPrice, encryptedAmount] = await Promise.all([
        encryptTE(toBytes(params.targetPrice), rpcUrl),
        encryptTE(toBytes(params.amount), rpcUrl),
      ]);

      setIsEncrypting(false);
      setIsPending(true);

      // Submit the limit order transaction
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'submitLimitOrder',
        args: [
          params.pool,
          encryptedTargetPrice,
          encryptedAmount,
          params.direction,
          params.deadline,
        ],
        value: gasDepositAmount ?? BigInt(0),
      });

      // Extract orderId from receipt logs after confirmation
      // OrderSubmitted event has signature: OrderSubmitted(address,uint256,uint256,bytes,bytes)
      // The orderId is the second parameter (indexed)
      if (receipt) {
        const orderSubmittedTopic = '0x' + '0'; // Will be set from actual event signature
        for (const log of receipt.logs) {
          // Parse OrderSubmitted event to get orderId
          if (log.topics[0]) {
            // The orderId is returned from the contract function
            const result = await receipt.logs[0]?.data;
            // For now, the contract returns orderId as the return value
            setOrderId(BigInt(0)); // Will be updated from receipt
          }
        }
      }

      return {
        orderId: BigInt(0), // Will be populated from receipt
        txHash: writeData ?? '0x' as `0x${string}`,
      };
    } finally {
      setIsPending(false);
      setIsEncrypting(false);
    }
  };

  return {
    createOrder,
    isPending,
    isEncrypting,
    isConfirming,
    receipt,
    txHash: writeData,
    orderId,
  };
}

/**
 * Hook for canceling limit orders
 */
export function useCancelLimitOrder() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const cancelOrder = async (
    contractAddress: Address,
    pool: Address,
    orderId: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'cancelOrder',
        args: [pool, orderId],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    cancelOrder,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for checking and matching orders
 */
export function useCheckOrders() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const checkOrders = async (
    contractAddress: Address,
    pool: Address
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'checkOrders',
        args: [pool],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    checkOrders,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for depositing gas for CTX execution
 */
export function useDepositGas() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const depositGas = async (
    contractAddress: Address,
    amount: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'depositGas',
        value: amount,
      } as any);
    } finally {
      setIsPending(false);
    }
  };

  return {
    depositGas,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for claiming filled orders
 */
export function useClaimOrder() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const claimOrder = async (
    contractAddress: Address,
    pool: Address,
    orderId: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'claimOrder',
        args: [pool, orderId],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    claimOrder,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}

/**
 * Hook for withdrawing deposited gas
 */
export function useWithdrawGas() {
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  const withdrawGas = async (
    contractAddress: Address,
    amount: bigint
  ): Promise<void> => {
    setIsPending(true);

    try {
      writeContract({
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: 'withdrawGas',
        args: [amount],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    withdrawGas,
    isPending,
    isConfirming,
    receipt,
    txHash: writeData,
  };
}
