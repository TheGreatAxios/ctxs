'use client';

import { usePoolInfo, usePoolReserves, usePoolTotalSupply } from '@/lib/hooks/usePool';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { useState } from 'react';
import { FACTORY_ADDRESS, ROUTER_ADDRESS } from '@/config/contracts';

interface PoolDetailProps {
  pairAddress: `0x${string}`;
}

export function PoolDetail({ pairAddress }: PoolDetailProps) {
  const { address } = useAccount();
  const { data: poolInfo } = usePoolInfo(pairAddress);
  const { data: reserves } = usePoolReserves(pairAddress);
  const { data: totalSupply } = usePoolTotalSupply(pairAddress);

  const { data: userLpBalance } = useBalance({
    address,
    token: pairAddress,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  if (!poolInfo || !reserves || !totalSupply) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const typedReserves = reserves as readonly [bigint, bigint, bigint];
  const reserve0 = typedReserves[0];
  const reserve1 = typedReserves[1];

  const typedTotalSupply = totalSupply as bigint;
  const token0 = poolInfo.token0 as `0x${string}`;
  const token1 = poolInfo.token1 as `0x${string}`;

  const userShare = userLpBalance
    ? (Number(userLpBalance.value) / Number(formatUnits(typedTotalSupply, 18))) * 100
    : 0;

  const userReserve0 = userLpBalance
    ? (userLpBalance.value * reserve0) / typedTotalSupply
    : BigInt(0);

  const userReserve1 = userLpBalance
    ? (userLpBalance.value * reserve1) / typedTotalSupply
    : BigInt(0);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-foreground">
            {getTokenSymbol(token0)} / {getTokenSymbol(token1)}
          </h1>
          <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
            Pool
          </span>
        </div>
        <p className="text-muted-foreground font-mono text-sm">{pairAddress}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PoolStatsCard
          title="Pool Reserves"
          reserve0={reserve0}
          reserve1={reserve1}
          token0={token0}
          token1={token1}
        />

        <PoolStatsCard
          title="Total Supply"
          totalSupply={typedTotalSupply}
        />

        <div className="md:col-span-2">
          <UserPositionCard
            userLpBalance={userLpBalance?.value ?? BigInt(0)}
            userShare={userShare}
            userReserve0={userReserve0}
            userReserve1={userReserve1}
            token0={token0}
            token1={token1}
            pairAddress={pairAddress}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setShowRemoveModal(true)}
          disabled={!userLpBalance || userLpBalance.value === BigInt(0)}
          className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Remove Liquidity
        </button>
      </div>

      {showAddModal && (
        <AddLiquidityModal
          pairAddress={pairAddress}
          token0={token0}
          token1={token1}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showRemoveModal && (
        <RemoveLiquidityModal
          pairAddress={pairAddress}
          token0={token0}
          token1={token1}
          lpBalance={userLpBalance?.value ?? BigInt(0)}
          onClose={() => setShowRemoveModal(false)}
        />
      )}
    </div>
  );
}

function PoolStatsCard({
  title,
  reserve0,
  reserve1,
  token0,
  token1,
  totalSupply,
}: {
  title: string;
  reserve0?: bigint;
  reserve1?: bigint;
  token0?: `0x${string}`;
  token1?: `0x${string}`;
  totalSupply?: bigint;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3">
        {reserve0 !== undefined && token0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{getTokenSymbol(token0)}</span>
            <span className="text-foreground font-medium">
              {formatUnits(reserve0, 18)}
            </span>
          </div>
        )}
        {reserve1 !== undefined && token1 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{getTokenSymbol(token1)}</span>
            <span className="text-foreground font-medium">
              {formatUnits(reserve1, 18)}
            </span>
          </div>
        )}
        {totalSupply !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">LP Tokens</span>
            <span className="text-foreground font-medium">
              {formatUnits(totalSupply, 18)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function UserPositionCard({
  userLpBalance,
  userShare,
  userReserve0,
  userReserve1,
  token0,
  token1,
  pairAddress,
}: {
  userLpBalance: bigint;
  userShare: number;
  userReserve0: bigint;
  userReserve1: bigint;
  token0: `0x${string}`;
  token1: `0x${string}`;
  pairAddress: `0x${string}`;
}) {
  const hasPosition = userLpBalance > BigInt(0);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Your Position</h2>

      {!hasPosition ? (
        <p className="text-muted-foreground">No liquidity position in this pool</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">LP Tokens</span>
            <span className="text-foreground font-medium">
              {formatUnits(userLpBalance, 18)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pool Share</span>
            <span className="text-foreground font-medium">{userShare.toFixed(4)}%</span>
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-sm text-muted-foreground">Your tokens:</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{getTokenSymbol(token0)}</span>
              <span className="text-foreground font-medium">
                {formatUnits(userReserve0, 18)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{getTokenSymbol(token1)}</span>
              <span className="text-foreground font-medium">
                {formatUnits(userReserve1, 18)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddLiquidityModal({
  pairAddress,
  token0,
  token1,
  onClose,
}: {
  pairAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  onClose: () => void;
}) {
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  const handleAdd = () => {
    // TODO: Implement add liquidity logic
    console.log('Add liquidity:', { amount0, amount1 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">Add Liquidity</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              {getTokenSymbol(token0)} Amount
            </label>
            <input
              type="text"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              {getTokenSymbol(token1)} Amount
            </label>
            <input
              type="text"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              placeholder="0.0"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Add Liquidity
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoveLiquidityModal({
  pairAddress,
  token0,
  token1,
  lpBalance,
  onClose,
}: {
  pairAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  lpBalance: bigint;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');

  const handleRemove = () => {
    // TODO: Implement remove liquidity logic
    console.log('Remove liquidity:', { amount });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">Remove Liquidity</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              LP Token Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              placeholder="0.0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: {formatUnits(lpBalance, 18)} LP
            </p>
          </div>

          <button
            onClick={handleRemove}
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Remove Liquidity
          </button>
        </div>
      </div>
    </div>
  );
}

function getTokenSymbol(tokenAddress: `0x${string}`): string {
  const tokenMap: Record<string, string> = {
    '0x0000000000000000000000000000000000000000': 'ETH',
  };
  return tokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 6);
}
