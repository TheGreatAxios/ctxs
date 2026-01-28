'use client';

import Dexie, { Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Address } from 'viem';

export interface LocalOrder {
  id?: number;
  orderId: bigint;
  pool: Address;
  targetPrice: string; // Encrypted stored, decrypted for display
  amount: string; // Encrypted stored, decrypted for display
  direction: boolean; // true = buy, false = sell
  deadline: bigint;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'expired';
  txHash?: string;
  createdAt: Date;
  userAddress: Address;
  chainId: number;
}

class OrdersDatabase extends Dexie {
  orders!: Table<LocalOrder>;

  constructor() {
    super('BiteSwapOrders');
    this.version(1).stores({
      orders: '++id, orderId, pool, userAddress, chainId, status, createdAt',
    });
  }
}

// Lazy initialize DB only on client side
let db: OrdersDatabase | null = null;

function getDb(): OrdersDatabase {
  if (typeof window === 'undefined') {
    throw new Error(' Dexie can only be used on the client side');
  }
  if (!db) {
    db = new OrdersDatabase();
  }
  return db;
}

export function useLocalOrders(userAddress: Address | undefined, chainId: number) {
  const orders = useLiveQuery(
    () =>
      userAddress
        ? getDb()
            .orders
            .where({ userAddress, chainId })
            .reverse()
            .sortBy('createdAt') as Promise<LocalOrder[]>
        : Promise.resolve([] as LocalOrder[]),
    [userAddress, chainId],
    [] as LocalOrder[]
  );

  const addOrder = async (order: Omit<LocalOrder, 'id'>) => {
    return await getDb().orders.add(order);
  };

  const updateOrder = async (id: number, changes: Partial<LocalOrder>) => {
    return await getDb().orders.update(id, changes);
  };

  const updateOrderByOrderId = async (
    orderId: bigint,
    userAddress: Address,
    changes: Partial<LocalOrder>
  ) => {
    const order = await getDb()
      .orders
      .where({ orderId, userAddress })
      .first();
    if (order?.id) {
      return await getDb().orders.update(order.id, changes);
    }
  };

  const deleteOrder = async (id: number) => {
    return await getDb().orders.delete(id);
  };

  const clearOrders = async (userAddress: Address, chainId: number) => {
    return await getDb()
      .orders
      .where({ userAddress, chainId })
      .delete();
  };

  return {
    orders: orders ?? [],
    addOrder,
    updateOrder,
    updateOrderByOrderId,
    deleteOrder,
    clearOrders,
  };
}

export { getDb as db };
