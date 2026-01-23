'use client';

import { LimitOrderForm } from '@/components/dex/LimitOrderForm';
import { OrderList } from '@/components/dex/OrderList';

export default function OrdersPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Limit Orders
        </h1>
        <p className="text-muted-foreground">
          Place and manage encrypted limit orders with privacy
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <div className="order-2 lg:order-1">
          <LimitOrderForm />
        </div>

        {/* Orders List */}
        <div className="order-1 lg:order-2">
          <OrderList />
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-card/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          How Limit Orders Work
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-primary mb-2">
              1. Encrypt & Submit
            </h4>
            <p className="text-sm text-muted-foreground">
              Your order details are encrypted using BITE threshold encryption
              before submission
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-primary mb-2">
              2. Order Matching
            </h4>
            <p className="text-sm text-muted-foreground">
              Orders are automatically matched when market conditions meet your
              target price
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-primary mb-2">
              3. Private Execution
            </h4>
            <p className="text-sm text-muted-foreground">
              Filled orders execute via CTX, revealing only necessary
              information on-chain
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
