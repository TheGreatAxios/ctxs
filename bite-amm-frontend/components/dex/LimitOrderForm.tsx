'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { ArrowUpDown, Clock, DollarSign, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useCreateLimitOrder, type LimitOrderParams } from '@/lib/hooks/useLimitOrders';
import { useApprove } from '@/lib/hooks/useSwap';
import { useLocalOrders } from '@/lib/hooks/useLocalOrders';
import { useTokenAllowance } from '@/lib/hooks/useContractRead';
import { useAllPairsLength, useAllPairs, useMultiplePoolsInfo, type PoolInfo } from '@/lib/hooks/usePool';
import { useMultipleTokenInfo } from '@/lib/hooks/useToken';
import { parseBigInt, formatBigInt } from '@/lib/utils';
import { CONTRACTS, getContractForChain } from '@/config/contracts';

interface Pool {
  address: Address;
  token0: { symbol: string; address: Address; decimals: number };
  token1: { symbol: string; address: Address; decimals: number };
}

const TARGET_CHAIN_ID = 2090472038;

export function LimitOrderForm() {
  const { address, chainId, chain } = useAccount();
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;

  const { addOrder } = useLocalOrders(address, chainId ?? TARGET_CHAIN_ID);
  const { createOrder, isEncrypting, isPending, isConfirming } =
    useCreateLimitOrder();
  const { approve, isPending: isApproving } = useApprove();

  // Fetch all pools from factory
  const { data: pairsLength } = useAllPairsLength(factoryAddress);
  const allPairsLength = (pairsLength as bigint | undefined) ?? BigInt(0);
  const { data: pairs } = useAllPairs(factoryAddress, allPairsLength);
  const validPairs = Array.from(
    new Set(pairs?.filter((p): p is `0x${string}` => p !== undefined) ?? []),
  );
  const { getPoolsInfo } = useMultiplePoolsInfo(validPairs);
  const poolsData = getPoolsInfo(validPairs);

  // Get token info for all pool tokens
  const uniqueTokens = Array.from(
    new Set(poolsData.flatMap((p) => [p.token0, p.token1])),
  );
  const { getTokenInfo } = useMultipleTokenInfo(uniqueTokens);

  // Get balances for tokens that are actually in pools (not hardcoded mainnet addresses)
  const { data: balancesData } = useReadContracts({
    contracts: uniqueTokens.map(addr => ({
      address: addr as Address,
      abi: [{
        name: 'balanceOf',
        type: 'function' as const,
        stateMutability: 'view' as const,
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      }],
      functionName: 'balanceOf',
      args: [address as Address],
    })),
    query: { enabled: !!address && uniqueTokens.length > 0 },
  });

  const tokenBalances = useMemo(() => {
    const balances = new Map<Address, bigint>();
    balancesData?.forEach((result, i) => {
      if (result?.status === 'success') {
        balances.set(uniqueTokens[i], result.result as unknown as bigint);
      }
    });
    console.log('Token balances from pools:', Object.fromEntries(balances));
    return balances;
  }, [balancesData, uniqueTokens]);

  // Build pool list with balance info
  const poolsWithBalance = useMemo(() => {
    return poolsData
      .map(pool => {
        const token0Info = getTokenInfo(pool.token0);
        const token1Info = getTokenInfo(pool.token1);
        if (!token0Info || !token1Info) return null;

        const balance0 = tokenBalances.get(pool.token0) ?? 0n;
        const balance1 = tokenBalances.get(pool.token1) ?? 0n;
        const hasBalance = balance0 > 0n || balance1 > 0n;

        return {
          address: pool.address,
          token0: { symbol: token0Info.symbol, address: pool.token0, decimals: token0Info.decimals },
          token1: { symbol: token1Info.symbol, address: pool.token1, decimals: token1Info.decimals },
          hasBalance,
          balance0,
          balance1,
        };
      })
      .filter((p): p is Pool & { hasBalance: boolean; balance0: bigint; balance1: bigint } => p !== null);
  }, [poolsData, getTokenInfo, tokenBalances]);

  const [selectedPool, setSelectedPool] = useState<Pool & { hasBalance: boolean } | null>(poolsWithBalance[0] ?? null);
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('24');
  const [needsApproval, setNeedsApproval] = useState(false);

  // Update selected pool when pools load
  useEffect(() => {
    if (poolsWithBalance.length > 0 && !selectedPool) {
      setSelectedPool(poolsWithBalance[0]);
    }
  }, [poolsWithBalance, selectedPool]);

  // Determine input token based on direction
  const inputToken = selectedPool
    ? direction === 'buy'
      ? selectedPool.token1.address
      : selectedPool.token0.address
    : undefined;

  const { data: tokenBalance } = useBalance({
    address,
    token: inputToken,
  });

  // Check token allowance
  const { data: allowance } = useTokenAllowance(
    inputToken ?? ('0x' as Address),
    address ?? ('0x' as Address),
    selectedPool?.address ?? ('0x' as Address),
  );

  const amountBigInt = useMemo(() => {
    if (!selectedPool) return 0n;
    return parseBigInt(
      amount,
      direction === 'buy' ? selectedPool.token1.decimals : selectedPool.token0.decimals
    );
  }, [amount, direction, selectedPool]);

  // Check if approval is needed
  useEffect(() => {
    const allowanceValue = allowance as bigint | undefined;
    if (allowanceValue != null && allowanceValue !== undefined && amountBigInt > 0n) {
      setNeedsApproval(allowanceValue < amountBigInt);
    }
  }, [allowance, amountBigInt]);

  const handleApprove = async () => {
    if (!address || !inputToken || !selectedPool) return;
    await approve(inputToken, selectedPool.address, amountBigInt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !selectedPool) return;

    const priceBigInt = parseBigInt(targetPrice, 18);

    // Check approval first
    if (needsApproval) {
      await handleApprove();
      return;
    }

    const params: LimitOrderParams = {
      pool: selectedPool.address,
      targetPrice: priceBigInt,
      amount: amountBigInt,
      direction: direction === 'buy',
      deadline: BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 3600),
    };

    if (!contracts || !contracts.router) {
      console.error('Router not configured');
      return;
    }

    try {
      await createOrder(params, contracts.router, CONTRACTS.limitOrderBook);

      // Store locally with encrypted data
      await addOrder({
        orderId: BigInt(0),
        pool: selectedPool.address,
        targetPrice,
        amount,
        direction: direction === 'buy',
        deadline: params.deadline,
        status: 'pending',
        createdAt: new Date(),
        userAddress: address,
        chainId: chainId ?? TARGET_CHAIN_ID,
      });

      setAmount('');
      setTargetPrice('');
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const formattedBalance = useMemo(() => {
    if (!tokenBalance) return '0.00';
    return formatBigInt(tokenBalance.value, tokenBalance.decimals);
  }, [tokenBalance]);

  const estimatedGas = BigInt('10000000000000000'); // 0.01 sFUEL for CTX execution

  if (!factoryAddress) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">Switch to SKALE Testnet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Zap className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-black text-stone-900 tracking-tight uppercase">Place Limit Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 flex-1 overflow-y-auto">
        {/* Pool Selector */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Trading Pair
          </label>
          {poolsWithBalance.length === 0 ? (
            <div className="w-full bg-stone-100 border-3 border-black rounded-lg px-3 py-2 text-stone-500 text-sm text-center">
              {allPairsLength === BigInt(0)
                ? 'No pools available'
                : 'No tokens in wallet'}
            </div>
          ) : (
            <select
              value={selectedPool?.address ?? ''}
              onChange={(e) => {
                const pool = poolsWithBalance.find((p) => p.address === e.target.value);
                if (pool) setSelectedPool(pool);
              }}
              className="w-full bg-white border-3 border-black rounded-lg px-3 py-2 text-stone-900 font-semibold focus:outline-none focus:ring-4 focus:ring-accent/50 text-sm"
            >
              {poolsWithBalance.map((pool) => (
                <option
                  key={pool.address}
                  value={pool.address}
                  className={!pool.hasBalance ? 'text-stone-400' : ''}
                >
                  {pool.token0.symbol}/{pool.token1.symbol}
                  {!pool.hasBalance && ' (No balance)'}
                </option>
              ))}
            </select>
          )}
        </div>

        {!selectedPool && poolsWithBalance.length > 0 && (
          <p className="text-xs font-semibold text-stone-500 text-center">
            Select a trading pair
          </p>
        )}

        {/* Direction Toggle */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Order Type
          </label>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'buy' ? 'sell' : 'buy'))}
            disabled={!selectedPool}
            className="w-full bg-white border-3 border-black rounded-lg px-3 py-2 text-stone-900 flex items-center justify-between hover:bg-accent transition-colors brutalist-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-black uppercase tracking-wider">
              {direction === 'buy' ? 'Buy' : 'Sell'} {selectedPool?.token0.symbol ?? '---'}
            </span>
            <ArrowUpDown className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Target Price */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Target Price
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="number"
              step="0.000001"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              required
              disabled={!selectedPool}
              className="w-full bg-white border-3 border-black rounded-lg pl-10 pr-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
              {selectedPool?.token1.symbol ?? '---'}/{selectedPool?.token0.symbol ?? '---'}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              disabled={!selectedPool}
              className="w-full bg-white border-3 border-black rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500">
                {selectedPool
                  ? direction === 'buy'
                    ? selectedPool.token1.symbol
                    : selectedPool.token0.symbol
                  : '---'}
              </span>
              <button
                type="button"
                onClick={() => setAmount(formattedBalance)}
                disabled={!selectedPool}
                className="text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-wider px-1.5 py-0.5 bg-accent/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Max
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-stone-500">
            Available: {formattedBalance}{' '}
            {selectedPool
              ? direction === 'buy'
                ? selectedPool.token1.symbol
                : selectedPool.token0.symbol
              : ''}
          </p>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Deadline
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <select
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white border-3 border-black rounded-lg pl-10 pr-3 py-2 text-stone-900 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold appearance-none text-sm"
            >
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
            </select>
          </div>
        </div>

        {/* Approval Warning */}
        {needsApproval && amountBigInt > 0n && selectedPool && (
          <div className="bg-warning/10 border-2 border-warning rounded-lg p-3 brutalist-shadow-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  Approval Required
                </p>
                <p className="text-[10px] font-semibold text-stone-600 mt-0.5">
                  Approve {direction === 'buy' ? selectedPool.token1.symbol : selectedPool.token0.symbol} to continue
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gas Deposit Info */}
        <div className="bg-stone-100 border-2 border-black rounded-lg p-3">
          <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Gas: {formatBigInt(estimatedGas, 18)} sFUEL
          </p>
          <p className="text-[10px] font-semibold text-stone-500">
            For CTX execution
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            !address ||
            !selectedPool ||
            isEncrypting ||
            isPending ||
            isConfirming ||
            isApproving
          }
          className={`w-full ${
            needsApproval
              ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
              : 'bg-accent hover:bg-accent/90 text-accent-foreground'
          } disabled:bg-stone-300 disabled:cursor-not-allowed font-black rounded-lg px-3 py-3 brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest flex items-center justify-center gap-2 text-sm flex-shrink-0`}
        >
          {((isEncrypting || isPending || isConfirming || isApproving) && (
            <Loader2 className="w-4 h-4 animate-spin" />
          ))}
          {isEncrypting
            ? 'Encrypting...'
            : isApproving
            ? 'Approving...'
            : isPending
            ? 'Submitting...'
            : isConfirming
            ? 'Confirming...'
            : needsApproval
            ? `Approve ${selectedPool ? (direction === 'buy' ? selectedPool.token1.symbol : selectedPool.token0.symbol) : 'token'}`
            : 'Place Order'}
        </button>

        {!address && (
          <p className="text-center text-xs font-semibold text-stone-500">
            Connect wallet to continue
          </p>
        )}
      </form>
    </div>
  );
}
