import {
  useSimulateContract,
  useWriteContract,
  useReadContract,
  useReadContracts,
} from "wagmi";
import type { Address } from "viem";
import { toBytes, toHex, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { useState, useEffect } from "react";
import { encryptTE } from "../bite/encryption";
import { useTxReceipt } from "./useTxReceipt";
import ScheduledSwapBookABI from "../../../abi/ScheduledSwapBook.json";
import ConfidentialLimitOrderBookABI from "../../../abi/ConfidentialLimitOrderBook.json";

const SCHEDULED_SWAP_BOOK_ABI = ScheduledSwapBookABI.abi;
const LIMIT_ORDER_BOOK_ABI = ConfidentialLimitOrderBookABI.abi;

export interface ScheduledSwapParams {
  pool: Address;
  targetPrice: bigint;
  amount: bigint;
  // Contract direction: true = token0→token1, false = token1→token0
  direction: boolean;
  deadline: bigint;
}

export interface EncryptedScheduledSwapParams extends Omit<
  ScheduledSwapParams,
  "targetPrice" | "amount"
> {
  encryptedTargetPrice: `0x${string}`;
  encryptedAmount: `0x${string}`;
}

export interface CreateSwapResult {
  swapId: bigint;
  txHash: `0x${string}`;
}

/**
 * Hook for creating encrypted scheduled swaps
 */
export function useCreateScheduledSwap() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const createSwap = async (
    params: ScheduledSwapParams,
    rpcUrl: string,
    contractAddress: Address,
  ): Promise<CreateSwapResult> => {
    setIsEncrypting(true);
    setError(null);

    try {
      // Encrypt sensitive data using threshold encryption
      const [encryptedTargetPrice, encryptedAmount] = await Promise.all([
        encryptTE(toBytes(params.targetPrice), rpcUrl),
        encryptTE(toBytes(params.amount), rpcUrl),
      ]);

      setIsEncrypting(false);

      // Submit the scheduled swap transaction
      writeContract(
        {
          address: contractAddress,
          abi: SCHEDULED_SWAP_BOOK_ABI,
          functionName: "submitScheduledSwap",
          args: [
            params.pool,
            encryptedAmount,
            encryptedTargetPrice,
            params.direction,
            params.deadline,
          ],
          value: BigInt(10_000_000_000_000_000), // 0.01 ETH for CTX gas
          gas: 25_000_000n,
        },
        {
          onSuccess: (hash) => {
            console.log("Create swap success:", hash);
            setActiveHash(hash);
          },
          onError: (err) => {
            console.error("Create swap error:", err);
            setError(
              err instanceof Error ? err.message : "Failed to create swap",
            );
          },
        },
      );

      return {
        swapId: BigInt(0), // Will be populated from receipt
        txHash: writeData ?? ("0x" as `0x${string}`),
      };
    } catch (err) {
      setIsEncrypting(false);
      const message =
        err instanceof Error ? err.message : "Failed to create swap";
      setError(message);
      throw err;
    }
  };

  // Reset state after receipt
  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Swap transaction reverted");
      }
      const timer = setTimeout(() => {
        setActiveHash(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    createSwap,
    isPending,
    isEncrypting,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for canceling scheduled swaps
 */
export function useCancelSwap() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const cancelSwap = async (
    contractAddress: Address,
    pool: Address,
    swapId: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: SCHEDULED_SWAP_BOOK_ABI,
        functionName: "cancelSwap",
        args: [pool, swapId],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to cancel swap",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Cancel swap transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    cancelSwap,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for checking and triggering swaps
 */
export function useCheckSwaps() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const checkSwaps = async (
    contractAddress: Address,
    pool: Address,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: SCHEDULED_SWAP_BOOK_ABI,
        functionName: "checkSwaps",
        args: [pool],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to check swaps",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Check swaps transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    checkSwaps,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for setting/updating price for a pool
 */
export function useSetPrice() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const setPrice = async (
    contractAddress: Address,
    pool: Address,
    price: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: SCHEDULED_SWAP_BOOK_ABI,
        functionName: "setPrice",
        args: [pool, price],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to set price",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Set price transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    setPrice,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for fetching swaps from a pool
 */
export function useGetSwaps(contractAddress: Address, pool: Address) {
  const { data, error, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "getSwaps",
    args: [pool],
  });

  return {
    swaps: data as unknown[] | undefined,
    error,
    isLoading,
    refetch,
  };
}

/**
 * Hook for fetching active swap count for a pool
 */
export function useGetActiveSwapCount(contractAddress: Address, pool: Address) {
  const { data, error, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "getActiveSwapCount",
    args: [pool],
  });

  return {
    count: data as bigint | undefined,
    error,
    isLoading,
    refetch,
  };
}

// Type aliases for limit order naming convention
export type LimitOrderParams = ScheduledSwapParams;
export const useCreateLimitOrder = useCreateScheduledSwap;
export const useCancelLimitOrder = useCancelSwap;

/**
 * Hook for depositing gas to the limit order book
 */
export function useDepositGas() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const depositGas = async (
    contractAddress: Address,
    amount: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: "depositGas",
        args: [],
        value: amount,
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to deposit gas",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Deposit transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    depositGas,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for withdrawing gas from the limit order book
 */
export function useWithdrawGas() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData, activeHash]);

  const withdrawGas = async (
    contractAddress: Address,
    amount: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: "withdrawGas",
        args: [amount],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to withdraw gas",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Withdraw transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    withdrawGas,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}
