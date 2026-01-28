import { useSimulateContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { toBytes, toHex } from "viem";
import { useState, useEffect } from "react";
import { encryptTE } from "../bite/encryption";
import { useTxReceipt } from "./useTxReceipt";
import ConfidentialLimitOrderBookABI from "../../../abi/ConfidentialLimitOrderBook.json";

const LIMIT_ORDER_BOOK_ABI = ConfidentialLimitOrderBookABI.abi;

export interface LimitOrderParams {
  pool: Address;
  targetPrice: bigint;
  amount: bigint;
  direction: boolean; // true = buy, false = sell
  deadline: bigint;
}

export interface EncryptedLimitOrderParams extends Omit<
  LimitOrderParams,
  "targetPrice" | "amount"
> {
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
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  // Watch writeData for hash
  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      setActiveHash(writeData);
    }
  }, [writeData]);

  const createOrder = async (
    params: LimitOrderParams,
    rpcUrl: string,
    contractAddress: Address,
    gasDepositAmount?: bigint,
  ): Promise<CreateOrderResult> => {
    setIsEncrypting(true);
    setError(null);

    try {
      // Encrypt sensitive data using threshold encryption
      const [encryptedTargetPrice, encryptedAmount] = await Promise.all([
        encryptTE(toBytes(params.targetPrice), rpcUrl),
        encryptTE(toBytes(params.amount), rpcUrl),
      ]);

      setIsEncrypting(false);

      // Submit the limit order transaction
      writeContract(
        {
          address: contractAddress,
          abi: LIMIT_ORDER_BOOK_ABI,
          functionName: "submitLimitOrder",
          args: [
            params.pool,
            encryptedTargetPrice,
            encryptedAmount,
            params.direction,
            params.deadline,
          ],
          value: gasDepositAmount ?? BigInt(0),
        },
        {
          onSuccess: (hash) => {
            console.log("Create order success:", hash);
            setActiveHash(hash);
          },
          onError: (err) => {
            console.error("Create order error:", err);
            setError(err instanceof Error ? err.message : "Failed to create order");
          },
        },
      );

      return {
        orderId: BigInt(0), // Will be populated from receipt
        txHash: writeData ?? ("0x" as `0x${string}`),
      };
    } catch (err) {
      setIsEncrypting(false);
      const message = err instanceof Error ? err.message : "Failed to create order";
      setError(message);
      throw err;
    }
  };

  // Reset state after receipt
  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Order transaction reverted");
      }
      const timer = setTimeout(() => {
        setActiveHash(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    createOrder,
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
 * Hook for canceling limit orders
 */
export function useCancelLimitOrder() {
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
  }, [writeData]);

  const cancelOrder = async (
    contractAddress: Address,
    pool: Address,
    orderId: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: "cancelOrder",
        args: [pool, orderId],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to cancel order");
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Cancel order transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    cancelOrder,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for checking and matching orders
 */
export function useCheckOrders() {
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
  }, [writeData]);

  const checkOrders = async (
    contractAddress: Address,
    pool: Address,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: "checkOrders",
        args: [pool],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to check orders");
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Check orders transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    checkOrders,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for depositing gas for CTX execution
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
  }, [writeData]);

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
        value: amount,
      } as any,
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to deposit gas");
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Deposit gas transaction reverted");
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
 * Hook for claiming filled orders
 */
export function useClaimOrder() {
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
  }, [writeData]);

  const claimOrder = async (
    contractAddress: Address,
    pool: Address,
    orderId: bigint,
  ): Promise<void> => {
    setError(null);

    writeContract(
      {
        address: contractAddress,
        abi: LIMIT_ORDER_BOOK_ABI,
        functionName: "claimOrder",
        args: [pool, orderId],
      },
      {
        onSuccess: (hash) => setActiveHash(hash),
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to claim order");
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Claim order transaction reverted");
      }
      const timer = setTimeout(() => setActiveHash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    claimOrder,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for withdrawing deposited gas
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
  }, [writeData]);

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
          setError(err instanceof Error ? err.message : "Failed to withdraw gas");
        },
      },
    );
  };

  useEffect(() => {
    if (receipt && activeHash) {
      if (receipt.status === "reverted") {
        setError("Withdraw gas transaction reverted");
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
