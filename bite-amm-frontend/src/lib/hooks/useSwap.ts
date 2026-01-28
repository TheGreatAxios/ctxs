import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import type { Address } from "viem";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
} from "viem";
import { useState, useEffect } from "react";
import { useTxReceipt } from "./useTxReceipt";
import BiteSwapV2RouterABI from "../../../abi/BiteSwapV2Router.json";

const ROUTER_ABI = BiteSwapV2RouterABI.abi;

// Helper function to calculate output amount using constant product formula
// amountOut = amountIn * reserveOut / (reserveIn + amountIn)
// Fee is 0.3% so multiply by 997/1000
export function calculateAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error("Invalid reserves");
  }
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

export interface SwapParams {
  routerAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  recipient: Address;
}

/**
 * Hook for executing swaps via Router
 * Uses BiteSwapV2Router.swapExactTokensForTokens()
 */
export function useSwap() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRouter, setActiveRouter] = useState<Address | null>(null);
  const { address } = useAccount();

  const {
    writeContract,
    data: writeData,
    error: writeError,
  } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  // Watch writeData for hash as fallback
  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      console.log("writeData updated, setting activeHash:", writeData);
      setActiveHash(writeData);
    }
  }, [writeData]);

  // Watch writeError for immediate errors
  useEffect(() => {
    if (writeError) {
      console.error("writeContract error:", writeError);
      const message =
        writeError instanceof BaseError
          ? writeError.shortMessage || writeError.message
          : "Swap preparation failed";
      setError(message);
    }
  }, [writeError]);

  // Manual receipt check as backup for networks where useWaitForTransactionReceipt might fail
  useEffect(() => {
    if (!activeHash || !publicClient || receipt) return;

    let mounted = true;

    const checkReceipt = async () => {
      try {
        console.log("Manually checking receipt for:", activeHash);
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: activeHash,
        });
        if (mounted && txReceipt) {
          console.log("Manual receipt check result:", txReceipt);
          // This will trigger the useTxReceipt hook to update via its internal state
        }
      } catch (err) {
        if (mounted) {
          console.error("Manual receipt check error:", err);
        }
      }
    };

    // Start checking after a short delay
    const timer = setTimeout(checkReceipt, 2000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [activeHash, receipt, publicClient]);

  const swap = async (params: SwapParams): Promise<void> => {
    if (!address) throw new Error("No address connected");

    // Build token path
    const path = [params.tokenIn, params.tokenOut];

    // Clear previous errors and hash
    setError(null);
    setActiveRouter(params.routerAddress);

    console.log("Initiating swap:", { params, path });

    try {
      // Call router.swapExactTokensForTokens
      // Note: This Router ABI doesn't include deadline parameter
      writeContract(
        {
          address: params.routerAddress,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [params.amountIn, params.amountOutMin, path, params.recipient],
          // SKALE requires explicit gas settings
          gas: 25_000_000n,
          maxFeePerGas: 500_000_000n, // 0.5 gwei
          maxPriorityFeePerGas: 500_000_000n, // 0.5 gwei
        },
        {
          onSuccess: (hash) => {
            console.log("Swap onSuccess - setting hash:", hash);
            setActiveHash(hash);
          },
          onError: (err) => {
            console.error("Swap onError:", err);
            const message =
              err instanceof BaseError
                ? err.shortMessage || err.message
                : "Swap failed";
            setError(message);
          },
        },
      );
    } catch (err) {
      console.error("Swap sync error:", err);
      const message =
        err instanceof BaseError
          ? err.shortMessage || err.message
          : "Swap failed";
      setError(message);
    }
  };

  // Watch for writeData changes as backup
  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      console.log("writeData changed:", writeData);
      setActiveHash(writeData);
    }
  }, [writeData]);

  // Reset state after transaction completes
  useEffect(() => {
    if (receipt && activeHash) {
      console.log("Swap receipt received:", {
        status: receipt.status,
        receipt,
      });
      // Check if transaction failed
      if (receipt.status === "reverted") {
        console.error("Transaction reverted:", receipt);
        setError(
          `Transaction failed on-chain. Hash: ${activeHash.slice(0, 10)}...`,
        );
        // Don't reset hash immediately on error so user can see what failed
        const timer = setTimeout(() => {
          setActiveHash(null);
          setActiveRouter(null);
        }, 10000); // Keep error for 10s
        return () => clearTimeout(timer);
      }
      // Success - reset quickly
      const timer = setTimeout(() => {
        setActiveHash(null);
        setActiveRouter(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    swap,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for approving token spending
 */
export function useApprove() {
  const [activeHash, setActiveHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useTxReceipt({
    hash: activeHash ?? undefined,
  });

  const isPending = activeHash !== null && receipt === undefined;

  const approve = async (
    tokenAddress: Address,
    spender: Address,
    amount: bigint,
  ): Promise<void> => {
    // Clear previous errors
    setError(null);

    console.log("Initiating approval:", { tokenAddress, spender, amount });

    try {
      writeContract(
        {
          address: tokenAddress,
          abi: [
            {
              type: "function",
              name: "approve",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [spender, amount],
          // SKALE requires higher gas limit
          gas: 25_000_000n,
        },
        {
          onSuccess: (hash) => {
            console.log("Approval onSuccess callback:", hash);
            setActiveHash(hash);
          },
          onError: (error) => {
            console.error("Approval onError callback:", error);
            setError(error.message);
          },
        },
      );
    } catch (err) {
      console.error("Approval error (catch):", err);
      setError(err instanceof Error ? err.message : "Approval failed");
    }
  };

  // Watch for writeData changes as backup
  useEffect(() => {
    if (writeData && writeData !== activeHash) {
      console.log("writeData changed (approve):", writeData);
      setActiveHash(writeData);
    }
  }, [writeData]);

  // Reset state after transaction completes
  useEffect(() => {
    if (receipt && activeHash) {
      console.log("Approval receipt received:", {
        status: receipt.status,
        receipt,
      });
      if (receipt.status === "reverted") {
        console.error("Approval transaction reverted:", receipt);
        setError(
          `Approval transaction reverted. Transaction hash: ${activeHash}`,
        );
      }
      const timer = setTimeout(() => {
        setActiveHash(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [receipt, activeHash]);

  return {
    approve,
    isPending,
    isConfirming,
    receipt,
    txHash: activeHash,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for revoking token approval
 */
export function useRevokeApproval() {
  const { approve, isPending, isConfirming, receipt, txHash } = useApprove();

  const revoke = async (
    tokenAddress: Address,
    spender: Address,
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
