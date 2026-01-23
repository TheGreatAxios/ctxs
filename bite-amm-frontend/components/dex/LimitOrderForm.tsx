'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useSignMessage } from 'wagmi';
import type { Address } from 'viem';
import { ArrowUpDown, Clock, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useCreateLimitOrder, type LimitOrderParams } from '@/lib/hooks/useLimitOrders';
import { useApprove } from '@/lib/hooks/useSwap';
import { useLocalOrders } from '@/lib/hooks/useLocalOrders';
import { useTokenAllowance } from '@/lib/hooks/useContractRead';
import { parseBigInt, formatBigInt } from '@/lib/utils';
import { CONTRACTS } from '@/config/contracts';
import { skaleCtxChain } from '@/wagmi';
import { derivePublicKeyFromSignature } from '@/lib/bite/keyDerivation';

interface Pool {
  address: Address;
  token0: { symbol: string; address: Address; decimals: number };
  token1: { symbol: string; address: Address; decimals: number };
}

const MOCK_POOLS: Pool[] = [
  {
    address: '0x1234567890123456789012345678901234567890' as Address,
    token0: { symbol: 'FAI', address: '0xaaaa' as Address, decimals: 18 },
    token1: { symbol: 'USDT', address: '0xbbbb' as Address, decimals: 6 },
  },
  {
    address: '0x2345678901234567890123456789012345678901' as Address,
    token0: { symbol: 'SKL', address: '0xcccc' as Address, decimals: 18 },
    token1: { symbol: 'ETH', address: '0xdddd' as Address, decimals: 18 },
  },
];

export function LimitOrderForm() {
  const { address, chainId } = useAccount();
  const { addOrder } = useLocalOrders(address, chainId ?? skaleCtxChain.id);
  const { createOrder, isEncrypting, isPending, isConfirming } =
    useCreateLimitOrder();
  const { approve, isPending: isApproving } = useApprove();
  const { signMessage } = useSignMessage();

  const [selectedPool, setSelectedPool] = useState<Pool>(MOCK_POOLS[0]);
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('24');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [userPublicKey, setUserPublicKey] = useState<{ x: `0x${string}`; y: `0x${string}` } | null>(null);

  // Determine input token based on direction
  const inputToken = direction === 'buy'
    ? selectedPool.token1.address
    : selectedPool.token0.address;

  const { data: tokenBalance } = useBalance({
    address,
    token: inputToken,
    chainId: chainId ?? skaleCtxChain.id,
  });

  // Check token allowance
  const { data: allowance } = useTokenAllowance(
    inputToken,
    address ?? ('0x' as Address),
    selectedPool.address,
  );

  // Derive public key when wallet connects
  useEffect(() => {
    if (address && !userPublicKey) {
      signMessage(
        { message: 'Derive BITE V2 public key for encryption' },
        {
          onSuccess: async (signature) => {
            try {
              const pubKey = await derivePublicKeyFromSignature(
                'Derive BITE V2 public key for encryption',
                signature
              );
              setUserPublicKey(pubKey);
            } catch (error) {
              console.error('Failed to derive public key:', error);
            }
          },
        }
      );
    }
  }, [address, userPublicKey, signMessage]);

  const amountBigInt = useMemo(() => {
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
    if (!address) return;
    await approve(inputToken, selectedPool.address, amountBigInt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !userPublicKey) return;

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
      userPublicKey,
    };

    const rpcUrl = skaleCtxChain.rpcUrls.public.http[0];

    try {
      await createOrder(params, rpcUrl, CONTRACTS.limitOrderBook);

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
        chainId: chainId ?? skaleCtxChain.id,
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

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Place Limit Order</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pool Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Pair
          </label>
          <select
            value={selectedPool.address}
            onChange={(e) => {
              const pool = MOCK_POOLS.find((p) => p.address === e.target.value);
              if (pool) setSelectedPool(pool);
            }}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MOCK_POOLS.map((pool) => (
              <option key={pool.address} value={pool.address}>
                {pool.token0.symbol}/{pool.token1.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Direction Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Order Type
          </label>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'buy' ? 'sell' : 'buy'))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <span className="font-medium">
              {direction === 'buy' ? 'Buy' : ' Sell'} {selectedPool.token0.symbol}
            </span>
            <ArrowUpDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Target Price */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Price
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              step="0.000001"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {selectedPool.token1.symbol}/{selectedPool.token0.symbol}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {direction === 'buy'
                  ? selectedPool.token1.symbol
                  : selectedPool.token0.symbol}
              </span>
              <button
                type="button"
                onClick={() => setAmount(formattedBalance)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                MAX
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Available: {formattedBalance}{' '}
            {direction === 'buy'
              ? selectedPool.token1.symbol
              : selectedPool.token0.symbol}
          </p>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deadline
          </label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        {needsApproval && amountBigInt > 0n && (
          <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-200 font-medium">
                  Approval Required
                </p>
                <p className="text-xs text-yellow-300 mt-1">
                  You need to approve {direction === 'buy' ? selectedPool.token1.symbol : selectedPool.token0.symbol} before placing this order.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gas Deposit Info */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-300 mb-2">
            Gas Deposit Required: {formatBigInt(estimatedGas, 18)} sFUEL
          </p>
          <p className="text-xs text-gray-400">
            This amount covers CTX execution costs for your order
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            !address ||
            isEncrypting ||
            isPending ||
            isConfirming ||
            isApproving ||
            !userPublicKey
          }
          className={`w-full ${
            needsApproval
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2`}
        >
          {((isEncrypting || isPending || isConfirming || isApproving) && (
            <Loader2 className="w-5 h-5 animate-spin" />
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
            ? `Approve ${direction === 'buy' ? selectedPool.token1.symbol : selectedPool.token0.symbol}`
            : 'Place Limit Order'}
        </button>

        {!address && (
          <p className="text-center text-sm text-gray-400">
            Please connect your wallet
          </p>
        )}

        {!userPublicKey && address && (
          <p className="text-center text-sm text-yellow-400">
            Please sign message to derive encryption key
          </p>
        )}
      </form>
    </div>
  );
}
