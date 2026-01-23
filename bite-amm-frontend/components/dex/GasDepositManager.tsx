'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { Wallet, ArrowUp, ArrowDown, Loader2, AlertCircle } from 'lucide-react';
import { useUserGasBalance } from '@/lib/hooks/useContractRead';
import { useDepositGas, useWithdrawGas } from '@/lib/hooks/useLimitOrders';
import { formatBigInt } from '@/lib/utils';
import { CONTRACTS } from '@/config/contracts';

const RECOMMENDED_DEPOSIT = BigInt('10000000000000000'); // 0.01 sFUEL
const MIN_DEPOSIT = BigInt('5000000000000000'); // 0.005 sFUEL

// Helper function to parse decimal string to bigint
function parseBigInt(value: string, decimals: number): bigint {
  if (!value) return 0n;
  const parts = value.split('.');
  if (parts.length === 1) {
    return BigInt(parts[0]) * BigInt(10 ** decimals);
  }
  const integer = parts[0] || '0';
  const fraction = parts[1].padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer) * BigInt(10 ** decimals) + BigInt(fraction);
}

export function GasDepositManager({
  limitOrderBookAddress,
}: {
  limitOrderBookAddress: Address;
}) {
  const { address } = useAccount();
  const { data: gasBalance } = useUserGasBalance(limitOrderBookAddress, address);
  const { depositGas, isPending: isDepositing } = useDepositGas();
  const { withdrawGas, isPending: isWithdrawing } = useWithdrawGas();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const currentBalance = (gasBalance as bigint | undefined) ?? 0n;
  const formattedBalance = formatBigInt(currentBalance, 18);

  const needsDeposit = currentBalance < RECOMMENDED_DEPOSIT;
  const isLow = currentBalance > 0n && currentBalance < RECOMMENDED_DEPOSIT;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    const amount = parseBigInt(depositAmount, 18);
    if (amount < MIN_DEPOSIT) {
      alert(`Minimum deposit is ${formatBigInt(MIN_DEPOSIT, 18)} sFUEL`);
      return;
    }

    await depositGas(limitOrderBookAddress, amount);
    setDepositAmount('');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    const amount = parseBigInt(withdrawAmount, 18);
    if (amount > currentBalance) {
      alert('Insufficient gas balance');
      return;
    }

    await withdrawGas(limitOrderBookAddress, amount);
    setWithdrawAmount('');
  };

  const handleQuickDeposit = (amount: bigint) => {
    setDepositAmount(formatBigInt(amount, 18));
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">CTX Gas Deposit</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Current Balance</p>
          <p className={`text-lg font-mono font-semibold ${
            needsDeposit ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {formattedBalance} sFUEL
          </p>
        </div>
      </div>

      {/* Status Message */}
      {needsDeposit && (
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-700 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm text-red-200 font-medium">
                No Gas Deposit
              </p>
              <p className="text-xs text-red-300 mt-1">
                Deposit gas to enable CTX execution for your orders
              </p>
            </div>
          </div>
        </div>
      )}

      {isLow && (
        <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-700 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-200 font-medium">
                Low Gas Balance
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                Consider depositing more gas for multiple orders
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'deposit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdraw')}
          disabled={currentBalance === 0n}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'withdraw'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ArrowDown className="w-4 h-4" />
          Withdraw
        </button>
      </div>

      {/* Deposit Form */}
      {activeTab === 'deposit' && (
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deposit Amount (sFUEL)
            </label>
            <input
              type="number"
              step="0.000001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.01"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Deposit Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDeposit(RECOMMENDED_DEPOSIT)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
            >
              0.01 sFUEL
            </button>
            <button
              type="button"
              onClick={() => handleQuickDeposit(BigInt('20000000000000000'))}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
            >
              0.02 sFUEL
            </button>
            <button
              type="button"
              onClick={() => handleQuickDeposit(BigInt('50000000000000000'))}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
            >
              0.05 sFUEL
            </button>
          </div>

          <button
            type="submit"
            disabled={!address || isDepositing || !depositAmount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2"
          >
            {isDepositing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isDepositing ? 'Depositing...' : 'Deposit Gas'}
          </button>
        </form>
      )}

      {/* Withdraw Form */}
      {activeTab === 'withdraw' && (
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Withdraw Amount (sFUEL)
            </label>
            <input
              type="number"
              step="0.000001"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Available: {formattedBalance} sFUEL
            </p>
          </div>

          <button
            type="button"
            onClick={() => setWithdrawAmount(formattedBalance)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
          >
            Withdraw All
          </button>

          <button
            type="submit"
            disabled={!address || isWithdrawing || !withdrawAmount}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2"
          >
            {isWithdrawing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Gas'}
          </button>
        </form>
      )}

      {!address && (
        <p className="text-center text-sm text-gray-400">
          Please connect your wallet
        </p>
      )}
    </div>
  );
}
