'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { Wallet, ArrowUp, ArrowDown, Loader2, AlertCircle } from 'lucide-react';
import { useUserGasBalance } from '@/lib/hooks/useContractRead';
import { useDepositGas, useWithdrawGas } from '@/lib/hooks/useLimitOrders';
import { formatBigInt } from '@/lib/utils';

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
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-primary rounded-full border-2 border-black">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-black text-stone-900 uppercase tracking-widest">CTX Gas Deposit</h3>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Current Balance</p>
          <p className={`text-lg font-mono font-black ${
            needsDeposit ? 'text-error' : isLow ? 'text-warning' : 'text-success'
          }`}>
            {formattedBalance} sFUEL
          </p>
        </div>
      </div>

      {/* Status Message */}
      {needsDeposit && (
        <div className="bg-error/10 border-2 border-error rounded-xl p-4 mb-5 brutalist-shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-wider">
                No Gas Deposit
              </p>
              <p className="text-xs font-semibold text-stone-600 mt-1">
                Deposit gas to enable CTX execution for your orders
              </p>
            </div>
          </div>
        </div>
      )}

      {isLow && (
        <div className="bg-warning/10 border-2 border-warning rounded-xl p-4 mb-5 brutalist-shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-wider">
                Low Gas Balance
              </p>
              <p className="text-xs font-semibold text-stone-600 mt-1">
                Consider depositing more gas for multiple orders
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase tracking-wider transition-all ${
            activeTab === 'deposit'
              ? 'bg-primary text-primary-foreground border-3 border-black brutalist-shadow'
              : 'bg-stone-100 text-stone-600 border-2 border-stone-300 hover:bg-stone-200'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdraw')}
          disabled={currentBalance === 0n}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase tracking-wider transition-all ${
            activeTab === 'withdraw'
              ? 'bg-secondary text-secondary-foreground border-3 border-black brutalist-shadow'
              : 'bg-stone-100 text-stone-400 border-2 border-stone-300 hover:bg-stone-200'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
        >
          <ArrowDown className="w-4 h-4" />
          Withdraw
        </button>
      </div>

      {/* Deposit Form */}
      {activeTab === 'deposit' && (
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Deposit Amount (sFUEL)
            </label>
            <input
              type="number"
              step="0.000001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.01"
              required
              className="w-full bg-white border-3 border-black rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-primary/50 font-semibold"
            />
          </div>

          {/* Quick Deposit Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDeposit(RECOMMENDED_DEPOSIT)}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-black py-2 px-3 rounded-xl border-2 border-black transition-all uppercase tracking-wider"
            >
              0.01 sFUEL
            </button>
            <button
              type="button"
              onClick={() => handleQuickDeposit(BigInt('20000000000000000'))}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-black py-2 px-3 rounded-xl border-2 border-black transition-all uppercase tracking-wider"
            >
              0.02 sFUEL
            </button>
            <button
              type="button"
              onClick={() => handleQuickDeposit(BigInt('50000000000000000'))}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-black py-2 px-3 rounded-xl border-2 border-black transition-all uppercase tracking-wider"
            >
              0.05 sFUEL
            </button>
          </div>

          <button
            type="submit"
            disabled={!address || isDepositing || !depositAmount}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:shadow-none text-primary-foreground font-black rounded-xl px-4 py-4 brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest flex items-center justify-center gap-2"
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
            <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Withdraw Amount (sFUEL)
            </label>
            <input
              type="number"
              step="0.000001"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-white border-3 border-black rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-secondary/50 font-semibold"
            />
            <p className="mt-2 text-xs font-semibold text-stone-500">
              Available: {formattedBalance} sFUEL
            </p>
          </div>

          <button
            type="button"
            onClick={() => setWithdrawAmount(formattedBalance)}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-black py-2 px-3 rounded-xl border-2 border-black transition-all uppercase tracking-wider"
          >
            Withdraw All
          </button>

          <button
            type="submit"
            disabled={!address || isWithdrawing || !withdrawAmount}
            className="w-full bg-secondary hover:bg-secondary/90 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:shadow-none text-secondary-foreground font-black rounded-xl px-4 py-4 brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isWithdrawing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Gas'}
          </button>
        </form>
      )}

      {!address && (
        <p className="text-center text-sm font-semibold text-stone-500">
          Please connect your wallet
        </p>
      )}
    </div>
  );
}
