'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ArrowDownUp, AlertCircle } from 'lucide-react';
import { cn, formatBigInt, parseBigInt } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TokenSelector, TokenInfo } from '@/components/dex/TokenSelector';
import { useSwap, useApprove } from '@/lib/hooks/useSwap';
import { useTokenAllowance, useReserves } from '@/lib/hooks/useContractRead';
import { useCoinbasePrice } from '@/lib/hooks/useCoinbasePrice';
import { usePairAddress } from '@/lib/hooks/usePairAddress';

const SLIPPAGE_TOLERANCE = 0.005; // 0.5%
const DEADLINE_MINUTES = 20;

interface SwapFormProps {
  factoryAddress?: `0x${string}`;
  availableTokens?: TokenInfo[];
}

export function SwapForm({ factoryAddress, availableTokens = [] }: SwapFormProps) {
  const { address, chain } = useAccount();
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [error, setError] = useState<string | null>(null);

  const { swap, isPending: swapPending, isConfirming } = useSwap();
  const { approve: approveToken, isPending: approvePending } = useApprove();

  // Look up pair address from factory based on selected tokens
  const { pairAddress, isLoading: isLoadingPair } = usePairAddress(
    factoryAddress,
    fromToken?.address,
    toToken?.address
  );

  // Get balances
  const { data: fromBalance } = useBalance({
    address: address,
    token: fromToken?.address,
  });

  // Get USD prices
  const { data: fromUsdPrice } = useCoinbasePrice(fromToken?.coinbaseId);
  const { data: toUsdPrice } = useCoinbasePrice(toToken?.coinbaseId);

  // Calculate USD values for display
  const fromUsdValue = useMemo(() => {
    if (!fromAmount || !fromUsdPrice) return null;
    const amount = parseFloat(fromAmount);
    return amount * fromUsdPrice;
  }, [fromAmount, fromUsdPrice]);

  const toUsdValue = useMemo(() => {
    if (!toAmount || !toUsdPrice) return null;
    const amount = parseFloat(toAmount);
    return amount * toUsdPrice;
  }, [toAmount, toUsdPrice]);

  // Get allowance (allow pair to spend tokens)
  const { data: allowanceRaw, refetch: refetchAllowance } = useTokenAllowance(
    fromToken?.address ?? '0x0000000000000000000000000000000000000001',
    address ?? '0x0000000000000000000000000000000000000001',
    pairAddress ?? '0x0000000000000000000000000000000000000001'
  );

  const allowance = allowanceRaw as bigint | undefined;

  // Calculate output amount (simplified AMM formula)
  const calculatedOutput = useMemo(() => {
    if (!fromAmount || !fromToken || !toToken) return null;
    // This is a simplified calculation. In production, you'd query the router
    // or use a price oracle for accurate pricing
    const amountIn = parseBigInt(fromAmount, fromToken.decimals ?? 18);
    // Mock calculation - replace with actual router quote
    return amountIn * BigInt(99) / BigInt(100); // Assume 1% fee
  }, [fromAmount, fromToken, toToken]);

  const needsApproval = useMemo(() => {
    if (!fromAmount || !fromToken || allowance === undefined || !pairAddress) return false;
    const amountIn = parseBigInt(fromAmount, fromToken.decimals ?? 18);
    return allowance < amountIn;
  }, [fromAmount, fromToken, allowance, pairAddress]);

  // Update output when input changes
  useEffect(() => {
    if (calculatedOutput && toToken) {
      setToAmount(formatBigInt(calculatedOutput, toToken.decimals ?? 18));
    } else {
      setToAmount('');
    }
  }, [calculatedOutput, toToken]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleMax = () => {
    if (fromBalance) {
      const formatted = formatBigInt(fromBalance.value, fromBalance.decimals);
      setFromAmount(formatted);
    }
  };

  const validateSwap = () => {
    if (!address) return 'Please connect your wallet';
    if (!fromToken || !toToken) return 'Please select both tokens';
    if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter an amount';
    if (fromToken?.address === toToken?.address) return 'Cannot swap same token';
    if (!pairAddress) return 'Trading pair does not exist';
    return null;
  };

  const handleApprove = async () => {
    const validationError = validateSwap();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!fromToken || !pairAddress) return;

    try {
      setError(null);
      const amountIn = parseBigInt(fromAmount, fromToken.decimals ?? 18);
      await approveToken(fromToken.address, pairAddress, amountIn);
      refetchAllowance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleSwap = async () => {
    const validationError = validateSwap();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!fromToken || !toToken || !pairAddress || !address) return;

    try {
      setError(null);
      const amountIn = parseBigInt(fromAmount, fromToken.decimals ?? 18);
      const amountOutMin = calculatedOutput
        ? (calculatedOutput * BigInt((1 - SLIPPAGE_TOLERANCE) * 10000)) / BigInt(10000)
        : BigInt(0);

      await swap({
        pairAddress,
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn,
        amountOutMin,
        recipient: address,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
  };

  const actionButton = () => {
    if (!address) return null; // RainbowKit handles connect button
    if (isLoadingPair) {
      return (
        <Button
          disabled
          className="w-full"
          size="lg"
        >
          Loading pair...
        </Button>
      );
    }
    if (needsApproval) {
      return (
        <Button
          onClick={handleApprove}
          isLoading={approvePending}
          className="w-full"
          size="lg"
        >
          Approve {fromToken?.symbol}
        </Button>
      );
    }
    return (
      <Button
        onClick={handleSwap}
        isLoading={swapPending || isConfirming}
        disabled={!fromAmount || !toAmount || !pairAddress}
        className="w-full"
        size="lg"
      >
        {isConfirming ? 'Confirming...' : swapPending ? 'Swapping...' : 'Swap'}
      </Button>
    );
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Swap</h2>
        <div className="text-sm text-muted-foreground">
          Slippage: {slippage}%
        </div>
      </div>

      <div className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">From</span>
            {fromBalance && (
              <button
                type="button"
                onClick={handleMax}
                className="text-xs text-primary hover:underline"
              >
                Max: {formatBigInt(fromBalance.value, fromBalance.decimals)}
              </button>
            )}
          </div>
          <TokenSelector
            selectedToken={fromToken}
            onSelect={setFromToken}
            label="Select token"
            availableTokens={availableTokens}
          />
          <div className="relative">
            <Input
              type="text"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              disabled={!fromToken}
              rightElement={<span className="text-sm text-muted-foreground">{fromToken?.symbol}</span>}
            />
            {fromUsdValue !== null && (
              <div className="absolute right-16 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ${fromUsdValue.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwapTokens}
            disabled={!fromToken || !toToken}
            className={cn(
              'rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <ArrowDownUp className="h-5 w-5" />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">To</span>
          <TokenSelector
            selectedToken={toToken}
            onSelect={setToToken}
            label="Select token"
            availableTokens={availableTokens}
          />
          <div className="relative">
            <Input
              type="text"
              placeholder="0.0"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
              disabled={!toToken}
              rightElement={<span className="text-sm text-muted-foreground">{toToken?.symbol}</span>}
            />
            {toUsdValue !== null && (
              <div className="absolute right-16 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ${toUsdValue.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price Display */}
      {calculatedOutput && fromToken && toToken && (
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium text-foreground">
              1 {fromToken.symbol} ={' '}
              {formatBigInt(
                (calculatedOutput * BigInt(10 ** (fromToken.decimals ?? 18))) /
                  parseBigInt(fromAmount, fromToken.decimals ?? 18),
                toToken.decimals ?? 18
              )}{' '}
              {toToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-error/10 p-3 text-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Action Button */}
      {actionButton()}

      {/* Info */}
      {needsApproval && allowance !== undefined && allowance > BigInt(0) && (
        <p className="text-center text-xs text-muted-foreground">
          Additional approval required. Current allowance:{' '}
          {formatBigInt(allowance, fromToken?.decimals ?? 18)}
        </p>
      )}
    </div>
  );
}
