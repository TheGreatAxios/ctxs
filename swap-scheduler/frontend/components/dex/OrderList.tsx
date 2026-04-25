"use client";

import { useAccount } from "wagmi";
import { X, Loader2, ExternalLink, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { useChainOrders } from "@/lib/hooks/useChainOrders";
import { useCancelLimitOrder } from "@/lib/hooks/useLimitOrders";
import { Badge } from "@/components/ui/Badge";
import { useContracts } from "@/config/contracts";

// All keys lowercase for consistent matching
// Format: "token0/token1" - token0 is first in pair
// Must match addresses in contracts.ts
const POOL_NAMES: Record<string, string> = {
  "0x723bb841b1d04a587f93822cca6ff6e8efbee3ab": "USDC/WETH",
  "0x73b5ebcb81c54308cec3c6d74f45bfeebdabe3f3": "USDC/WBTC",
  "0x4c9f01b7730260f34f8952858bed2336b2bbe3e6": "USDT/WETH",
  "0xf9730fd1f7abf47b9db2034995f63c310ba66463": "USDT/WBTC",
  "0x8e915c02e97f454b65a847eb9027ac5e74c982f4": "WETH/WBTC",
};

// Get swap direction display based on pool and contract direction
// contract direction: true = token0→token1, false = token1→token0
function getSwapDirection(poolName: string, contractDirection: boolean): { from: string; to: string } {
  const parts = poolName.split('/');
  const token0 = parts[0] ?? '?';
  const token1 = parts[1] ?? '?';
  if (contractDirection) {
    return { from: token0, to: token1 };
  } else {
    return { from: token1, to: token0 };
  }
}

function getPoolName(poolAddress: string): string {
  return POOL_NAMES[poolAddress.toLowerCase()] ?? poolAddress.slice(0, 8);
}

function getPoolUrl(poolAddress: string): string {
  return `/pools/${poolAddress}`;
}

function formatDeadline(deadline: bigint): string {
  if (deadline === 0n) return "No expiry";
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diff = Number(deadline - now);

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / 3600);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `<1h`;
}

export function OrderList() {
  const { address, chainId } = useAccount();
  const contracts = useContracts();
  const { orders, isLoading } = useChainOrders(
    address,
    chainId ?? 103698795,
    Object.values(contracts?.pairs ?? {}).filter(Boolean),
  );
  const { cancelSwap, isPending, isConfirming } = useCancelLimitOrder();

  const activeOrders = orders.filter((order) => order.active);

  const handleCancel = async (pool: string, swapId: bigint) => {
    try {
      await cancelSwap(
        contracts?.scheduledSwapBook,
        pool as `0x${string}`,
        swapId,
      );
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }
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

  if (isLoading) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-6 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (activeOrders.length === 0) {
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

      <div className="overflow-y-auto flex-1 divide-y divide-stone-200">
        {activeOrders.map((order) => (
          <div
            key={`${order.pool}-${order.swapId}`}
            className="px-3 py-2 hover:bg-stone-50 transition-colors flex items-center gap-3"
          >
            {/* Pool Name */}
            <Link
              href={getPoolUrl(order.pool)}
              className="font-black text-sm text-stone-900 uppercase tracking-wider hover:text-accent transition-colors min-w-[100px] truncate"
              title={getPoolName(order.pool)}
            >
              {getPoolName(order.pool)}
            </Link>

            {/* Direction Badge - shows actual swap direction */}
            <Badge
              variant="open"
              className="text-[9px] px-1.5 py-0 shrink-0"
            >
              {(() => {
                const poolName = getPoolName(order.pool);
                const { from, to } = getSwapDirection(poolName, order.direction);
                return `${from}→${to}`;
              })()}
            </Badge>

            {/* Encrypted Info - compact */}
            <div className="flex items-center gap-2 text-[10px] text-stone-600">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Price: 🔒
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Amt: 🔒
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Deadline */}
            {order.deadline > 0n && (
              <span className="text-[10px] font-semibold text-stone-500 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                {formatDeadline(order.deadline)}
              </span>
            )}

            {/* Explorer Link */}
            <a
              href={`https://base-sepolia-testnet-explorer.skalenodes.com:10032/address/${order.pool}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-accent transition-colors shrink-0"
              title="View on explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Cancel Button */}
            <button
              onClick={() => handleCancel(order.pool, order.swapId)}
              disabled={isPending || isConfirming}
              className="shrink-0 bg-error/10 hover:bg-error/20 disabled:bg-stone-100 disabled:cursor-not-allowed text-error border border-error rounded p-1 transition-all hover:shadow-[1px_1px_0_0_#000] active:shadow-none active:translate-y-[1px] active:translate-x-[1px]"
              title="Cancel order"
            >
              {isPending || isConfirming ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
