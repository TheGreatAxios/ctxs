import { useWaitForTransactionReceipt } from "wagmi";
import type { UseWaitForTransactionReceiptParameters } from "wagmi";

/**
 * Wrapper around useWaitForTransactionReceipt with 1 block confirmation
 * and 250ms polling interval for SKALE's fast block times
 */
export function useTxReceipt(params: UseWaitForTransactionReceiptParameters) {
  console.log("useTxReceipt called with hash:", params.hash);

  const result = useWaitForTransactionReceipt({
    ...params,
    confirmations: 1, // SKALE has fast finality
    pollingInterval: 1000, // Increased to 1s for more reliable polling
  });

  // Log state changes
  console.log("useTxReceipt state:", {
    hash: params.hash,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    data: result.data ? {
      status: result.data.status,
      blockNumber: result.data.blockNumber,
      gasUsed: result.data.gasUsed?.toString(),
    } : null,
    error: result.error?.message,
  });

  // Log receipt when received
  if (result.data && params.hash) {
    console.log(`Receipt received for ${params.hash.slice(0, 10)}...:`, {
      status: result.data.status,
      blockNumber: result.data.blockNumber,
      gasUsed: result.data.gasUsed?.toString(),
    });
  }

  return result;
}
