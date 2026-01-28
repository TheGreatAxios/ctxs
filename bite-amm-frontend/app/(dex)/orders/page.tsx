'use client';

import { LimitOrderForm } from '@/components/dex/LimitOrderForm';
import { OrderList } from '@/components/dex/OrderList';
import { PoolPriceTicker } from '@/components/dex/PoolPriceTicker';

export default function OrdersPage() {
  return (
    <div className="h-[calc(100vh-140px)] max-w-6xl mx-auto">
      {/* Compact Header */}
      <div className="mb-3 flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground">
          Limit Orders
        </h1>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-4 h-[calc(100%-40px)]">
        {/* Left: Trade Form */}
        <div className="min-h-0">
          <LimitOrderForm />
        </div>

        {/* Right: Live Price Feed (top) + Orders (bottom) */}
        <div className="flex flex-col min-h-0 gap-4">
          {/* Top: Live Price Feed */}
          <div className="min-h-[200px]">
            <PoolPriceTicker />
          </div>

          {/* Bottom: Orders List */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <OrderList />
          </div>
        </div>
      </div>
    </div>
  );
}
