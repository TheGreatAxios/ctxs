'use client';

import { useAccount } from 'wagmi';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { useLocalOrders } from '@/lib/hooks/useLocalOrders';
import { useCancelLimitOrder } from '@/lib/hooks/useLimitOrders';
import { Badge } from '@/components/ui/Badge';
import { CONTRACTS } from '@/config/contracts';
import { skaleCtxChain } from '@/wagmi';
import { shortenAddress } from '@/lib/utils';

export function OrderList() {
  const { address, chainId } = useAccount();
  const { orders, updateOrderByOrderId } = useLocalOrders(
    address,
    chainId ?? skaleCtxChain.id
  );
  const { cancelOrder, isPending, isConfirming } = useCancelLimitOrder();

  const handleCancel = async (pool: string, orderId: bigint) => {
    try {
      await cancelOrder(CONTRACTS.limitOrderBook, pool as `0x${string}`, orderId);
      await updateOrderByOrderId(orderId, address!, { status: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const getStatusVariant = (
    status: string
  ): 'pending' | 'open' | 'filled' | 'cancelled' | 'expired' => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'open':
        return 'open';
      case 'filled':
        return 'filled';
      case 'cancelled':
        return 'cancelled';
      case 'expired':
        return 'expired';
      default:
        return 'pending';
    }
  };

  const getPoolName = (poolAddress: string): string => {
    const poolNames: Record<string, string> = {
      '0x1234567890123456789012345678901234567890': 'FAI/USDT',
      '0x2345678901234567890123456789012345678901': 'SKL/ETH',
    };
    return poolNames[poolAddress] || shortenAddress(poolAddress);
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <p className="text-center text-gray-400">Connect wallet to view orders</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <p className="text-center text-gray-400">No orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Your Orders</h2>
      </div>

      <div className="divide-y divide-gray-700">
        {orders.map((order) => (
          <div
            key={order.id ?? order.orderId.toString()}
            className="p-6 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Pool Name & Direction */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-medium">
                    {getPoolName(order.pool)}
                  </span>
                  <Badge
                    variant={order.direction ? 'open' : 'cancelled'}
                    className="text-xs"
                  >
                    {order.direction ? 'BUY' : 'SELL'}
                  </Badge>
                  <Badge variant={getStatusVariant(order.status)} className="text-xs">
                    {order.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Price & Amount */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Target Price</p>
                    <p className="text-white font-medium">{order.targetPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Amount</p>
                    <p className="text-white font-medium">{order.amount}</p>
                  </div>
                </div>

                {/* Order ID & TX Link */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>ID: #{order.orderId.toString()}</span>
                  {order.txHash && (
                    <a
                      href={`${skaleCtxChain.blockExplorers.default.url}/tx/${order.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                      View TX
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Cancel Button */}
              {(order.status === 'open' || order.status === 'pending') && (
                <button
                  onClick={() => handleCancel(order.pool, order.orderId)}
                  disabled={isPending || isConfirming}
                  className="flex-shrink-0 bg-red-900/30 hover:bg-red-900/50 disabled:bg-gray-800 disabled:cursor-not-allowed text-red-300 border border-red-900/50 rounded-lg p-2 transition-colors"
                  title="Cancel order"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
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
