"use client";

import { useAccount } from "wagmi";
import { X, Loader2, ExternalLink } from "lucide-react";
import { useLocalOrders } from "@/lib/hooks/useLocalOrders";
import { useCancelLimitOrder } from "@/lib/hooks/useLimitOrders";
import { Badge } from "@/components/ui/Badge";
import { CONTRACTS } from "@/config/contracts";
import { skaleCtxChain } from "@/wagmi";
import { shortenAddress } from "@/lib/utils";
import { useMemo } from "react";

export function OrderList() {
  const { address, chainId } = useAccount();
  const { orders, updateOrderByOrderId } = useLocalOrders(
    address,
    chainId ?? skaleCtxChain.id,
  );
  const { cancelOrder, isPending, isConfirming } = useCancelLimitOrder();

  // Only show orders that were successfully submitted (have txHash)
  const submittedOrders = useMemo(() => {
    return orders.filter((order) => order.txHash);
  }, [orders]);

  const handleCancel = async (pool: string, orderId: bigint) => {
    try {
      await cancelOrder(
        CONTRACTS.limitOrderBook,
        pool as `0x${string}`,
        orderId,
      );
      await updateOrderByOrderId(orderId, address!, { status: "cancelled" });
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }
  };

  const getStatusVariant = (
    status: string,
  ): "pending" | "open" | "filled" | "cancelled" | "expired" => {
    switch (status) {
      case "pending":
        return "pending";
      case "open":
        return "open";
      case "filled":
        return "filled";
      case "cancelled":
        return "cancelled";
      case "expired":
        return "expired";
      default:
        return "pending";
    }
  };

  const getPoolName = (poolAddress: string): string => {
    const poolNames: Record<string, string> = {
      "0x1234567890123456789012345678901234567890": "FAI/USDT",
      "0x2345678901234567890123456789012345678901": "SKL/ETH",
    };
    return poolNames[poolAddress] || shortenAddress(poolAddress);
  };

  if (!address) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-6 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          Connect wallet to view orders
        </p>
      </div>
    );
  }

  if (submittedOrders.length === 0) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-6 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          No active orders found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b-3 border-black bg-stone-100 flex-shrink-0">
        <h2 className="text-lg font-black text-stone-900 uppercase tracking-widest">
          Your Orders
        </h2>
      </div>

      <div className="overflow-y-auto flex-1 divide-y-2 divide-stone-200">
        {submittedOrders.map((order) => (
          <div
            key={order.id ?? order.orderId.toString()}
            className="p-4 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Pool Name & Direction */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-black text-sm text-stone-900 uppercase tracking-wider">
                    {getPoolName(order.pool)}
                  </span>
                  <Badge
                    variant={order.direction ? "open" : "cancelled"}
                    className="text-[10px]"
                  >
                    {order.direction ? "BUY" : "SELL"}
                  </Badge>
                  <Badge
                    variant={getStatusVariant(order.status)}
                    className="text-[10px]"
                  >
                    {order.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Price & Amount */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-2">
                    <p className="text-[10px] font-bold text-stone-500 mb-0.5 uppercase tracking-wider">
                      Target
                    </p>
                    <p className="font-black text-sm text-stone-900">
                      {order.targetPrice}
                    </p>
                  </div>
                  <div className="bg-stone-50 border-2 border-stone-200 rounded-lg p-2">
                    <p className="text-[10px] font-bold text-stone-500 mb-0.5 uppercase tracking-wider">
                      Amount
                    </p>
                    <p className="font-black text-sm text-stone-900">
                      {order.amount}
                    </p>
                  </div>
                </div>

                {/* Order ID & TX Link */}
                <div className="flex items-center gap-2 text-[10px] font-semibold text-stone-500">
                  <span className="font-mono">#{order.orderId.toString()}</span>
                  {order.txHash && (
                    <a
                      href={`${skaleCtxChain.blockExplorers.default.url}/tx/${order.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors font-bold"
                    >
                      TX
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Cancel Button */}
              {(order.status === "open" || order.status === "pending") && (
                <button
                  onClick={() => handleCancel(order.pool, order.orderId)}
                  disabled={isPending || isConfirming}
                  className="flex-shrink-0 bg-error/10 hover:bg-error/20 disabled:bg-stone-100 disabled:cursor-not-allowed text-error border-2 border-error rounded-lg p-2 transition-all brutalist-shadow-sm hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"
                  title="Cancel order"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
