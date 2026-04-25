'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ArrowDownUp, AlertCircle, Settings, Zap, DollarSign, Eye, EyeOff } from 'lucide-react';
import { cn, formatBigInt, parseBigInt } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TokenSelector, TokenInfo } from '@/components/dex/TokenSelector';
import { useSwap, useApprove, calculateAmountOut } from '@/lib/hooks/useSwap';
import { useTokenAllowance, useReserves } from '@/lib/hooks/useContractRead';
import { useTokenPriceByAddress } from '@/lib/hooks/useTokenPrices';
import { useRoute } from '@/lib/hooks/useRoute';
import { useSwapAmounts } from '@/context/SwapAmountsContext';
import BiteSwapV2PairABI from '../../abi/BiteSwapV2Pair.json';

const DEADLINE_MINUTES = 20;

interface SwapFormProps {
  factoryAddress?: `0x${string}`;
  routerAddress?: `0x${string}`;
  availableTokens?: TokenInfo[];
}

const TARGET_CHAIN_ID = 103698795;

// Safe number formatter to handle NaN
const safeFixed = (value: number | null | undefined, decimals: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '---';
  return value.toFixed(decimals);
};

export function SwapForm({ factoryAddress, routerAddress, availableTokens = [] }: SwapFormProps) {
  const { address, chain, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { amounts: cachedAmounts, setAmounts: setCachedAmounts } = useSwapAmounts();
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [slippage, setSlippage] = useState('0.1');
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true); // Default: BITE encrypted
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'from' | 'to' | null>(null);
  const [processedReceiptHash, setProcessedReceiptHash] = useState<string | null>(null);

  const { swap, isPending: swapPending, isConfirming, receipt: swapReceipt, error: swapError, clearError: clearSwapError } = useSwap();
  const queryClient = useQueryClient();
  const { approve: approveToken, isPending: approvePending, error: approveError, clearError: clearApproveError, receipt: approveReceipt } = useApprove();

  const amountInForRoute = useMemo(() => {
    if (!cachedAmounts.fromAmount || !fromToken) return undefined;
    return parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18);
  }, [cachedAmounts.fromAmount, fromToken]);

  const { route, isLoading: isLoadingRoute } = useRoute(
    factoryAddress,
    fromToken?.address,
    toToken?.address,
    amountInForRoute
  );

  const pairAddress = useMemo(() => {
    if (!route || route.hops !== 1) return undefined;
    // For direct pair, get pair address from factory
    return route.path[0] && route.path[1] ? undefined : undefined;
  }, [route]);

  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address: address,
    token: fromToken?.address,
  });

  // Fetch live prices from CoinGecko (global context)
  const fromUsdPrice = useTokenPriceByAddress(fromToken?.address);
  const toUsdPrice = useTokenPriceByAddress(toToken?.address);

  // Calculate USD values for display
  const fromUsdValue = useMemo(() => {
    if (!cachedAmounts.fromAmount || fromUsdPrice === undefined) return null;
    const amount = parseFloat(cachedAmounts.fromAmount);
    if (isNaN(amount)) return null;
    const value = amount * fromUsdPrice;
    return isNaN(value) ? null : value;
  }, [cachedAmounts.fromAmount, fromUsdPrice]);

  const toUsdValue = useMemo(() => {
    if (!cachedAmounts.toAmount || toUsdPrice === undefined) return null;
    const amount = parseFloat(cachedAmounts.toAmount);
    if (isNaN(amount)) return null;
    const value = amount * toUsdPrice;
    return isNaN(value) ? null : value;
  }, [cachedAmounts.toAmount, toUsdPrice]);

  const { data: allowanceRaw, refetch: refetchAllowance } = useTokenAllowance(
    fromToken?.address ?? '0x0000000000000000000000000000000000000001',
    address ?? '0x0000000000000000000000000000000000000001',
    routerAddress ?? '0x0000000000000000000000000000000000000001'
  );

  const allowance = allowanceRaw as bigint | undefined;

  const calculatedOutput = useMemo(() => {
    // Use route estimated output for multi-hop support
    if (route?.estimatedOutput) {
      return route.estimatedOutput;
    }
    return null;
  }, [route]);

  const calculatedInput = useMemo(() => {
    // For reverse calculation, we need to recalculate route in reverse
    // This is complex for multi-hop, so for now just return null
    // User should use "from" amount primarily
    return null;
  }, []);

  const needsApproval = useMemo(() => {
    if (!cachedAmounts.fromAmount || !fromToken || allowance === undefined || !routerAddress) return false;
    const amountIn = parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18);
    const needs = allowance < amountIn;
    console.log("needsApproval check:", { allowance: allowance.toString(), amountIn: amountIn.toString(), needs, fromToken: fromToken.symbol });
    return needs;
  }, [cachedAmounts.fromAmount, fromToken, allowance, routerAddress]);

  useEffect(() => {
    if (editingField === 'from') {
      if (calculatedOutput && toToken) {
        setCachedAmounts({ toAmount: formatBigInt(calculatedOutput, toToken.decimals ?? 18) });
      }
      // Only clear toAmount if editing from and no output (not during token changes)
      else if (fromToken && toToken) {
        setCachedAmounts({ toAmount: '' });
      }
    } else if (editingField === 'to') {
      if (calculatedInput && fromToken) {
        setCachedAmounts({ fromAmount: formatBigInt(calculatedInput, fromToken.decimals ?? 18) });
      }
      // Only clear fromAmount if editing to and no input (not during token changes)
      else if (fromToken && toToken) {
        setCachedAmounts({ fromAmount: '' });
      }
    }
  }, [calculatedOutput, calculatedInput, toToken, fromToken, editingField, setCachedAmounts]);

  // Update error from hooks
  useEffect(() => {
    if (swapError) {
      setError(swapError);
    }
  }, [swapError]);

  useEffect(() => {
    if (approveError) {
      setError(approveError);
    }
  }, [approveError]);

  // Refetch allowance when approval receipt is received
  useEffect(() => {
    if (approveReceipt && approveReceipt.status === "success") {
      console.log("Approval confirmed, refetching allowance");
      refetchAllowance();
    }
  }, [approveReceipt]);

  // Refetch all data when swap receipt is received with success
  useEffect(() => {
    if (swapReceipt && swapReceipt.status === "success") {
      // Only process if this is a new receipt
      const receiptHash = swapReceipt.transactionHash;
      if (receiptHash === processedReceiptHash) {
        return; // Already processed this receipt
      }

      console.log("Swap confirmed, refetching all data");

      // Store swap details for success message before clearing amounts
      const fromAmount = cachedAmounts.fromAmount;
      const fromSymbol = fromToken?.symbol;
      const toAmount = cachedAmounts.toAmount;
      const toSymbol = toToken?.symbol;

      // Mark as processed
      setProcessedReceiptHash(receiptHash);

      // Refetch balances
      refetchFromBalance();
      if (toToken?.address && address) {
        queryClient.invalidateQueries({
          queryKey: ['balance', address, toToken.address],
        });
      }

      // Refetch allowance
      refetchAllowance();

      // Clear form amounts after successful swap
      setCachedAmounts({ fromAmount: '', toAmount: '' });

      // Clear any existing error
      setError(null);

      // Show success message
      if (fromAmount && toAmount && fromSymbol && toSymbol) {
        setSuccessMessage(`Swapped ${fromAmount} ${fromSymbol} for ${toAmount} ${toSymbol}`);
      }

      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      console.log("Swap complete - all data refetched");
      return () => clearTimeout(timer);
    }
  }, [swapReceipt, toToken, fromToken, address, queryClient, refetchFromBalance, refetchAllowance, setCachedAmounts, cachedAmounts, processedReceiptHash]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setCachedAmounts({
      fromAmount: cachedAmounts.toAmount,
      toAmount: cachedAmounts.fromAmount,
    });
  };

  const handleMax = () => {
    if (fromBalance) {
      const formatted = formatBigInt(fromBalance.value, fromBalance.decimals);
      setCachedAmounts({ fromAmount: formatted });
    }
  };

  const validateSwap = () => {
    if (!address) return 'Please connect your wallet';
    if (!fromToken || !toToken) return 'Please select both tokens';
    if (!cachedAmounts.fromAmount || parseFloat(cachedAmounts.fromAmount) <= 0) return 'Enter an amount';
    if (fromToken?.address === toToken?.address) return 'Cannot swap same token';
    if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') return 'Router not configured';
    if (!route) return 'No route found';
    return null;
  };

  const handleApprove = async () => {
    const validationError = validateSwap();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!fromToken || !routerAddress) {
      setError('Router address missing');
      return;
    }

    setError(null);
    clearSwapError();
    const amountIn = parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18);
    await approveToken(fromToken.address, routerAddress, amountIn);
    // Refetch immediately (optimistic) - will be refetched again when receipt confirms
    setTimeout(() => refetchAllowance(), 1000);
  };

  const handleSwap = async () => {
    const validationError = validateSwap();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!fromToken || !toToken || !routerAddress || !address || !route) return;

    setError(null);
    setSuccessMessage(null);
    setProcessedReceiptHash(null); // Clear processed hash for new swap
    clearApproveError();
    const amountIn = parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18);
    // Use the slippage state value (e.g., "0.1" = 0.1%, "1" = 1%)
    const slippageDecimal = Number.parseFloat(slippage) / 100;
    const amountOutMin = calculatedOutput
      ? (calculatedOutput * BigInt(Math.floor((1 - slippageDecimal) * 10000))) / BigInt(10000)
      : BigInt(0);

    await swap({
      routerAddress,
      path: route.path,
      amountIn,
      amountOutMin,
      recipient: address,
      useEncryption,
    });
  };

  const isWrongChain = chain && chain.id !== TARGET_CHAIN_ID;
  const needsGetStarted = !isConnected || isWrongChain;

  const handleGetStarted = async () => {
    if (!isConnected) {
      openConnectModal?.();
    } else if (isWrongChain && switchChain) {
      switchChain({ chainId: TARGET_CHAIN_ID });
    }
  };

  const actionButton = () => {
    if (needsGetStarted) {
      return (
        <Button
          onClick={handleGetStarted}
          className="w-full !h-11 text-sm font-extrabold uppercase"
        >
          {isWrongChain ? 'Switch Network' : 'Get Started'}
        </Button>
      );
    }
    if (isLoadingRoute) {
      return (
        <Button
          disabled
          className="w-full !h-11 text-sm"
        >
          Loading...
        </Button>
      );
    }
    if (needsApproval) {
      return (
        <Button
          onClick={handleApprove}
          isLoading={approvePending}
          className="w-full !h-11 text-sm font-extrabold uppercase"
          variant="secondary"
        >
          Approve {fromToken?.symbol}
        </Button>
      );
    }
    return (
      <Button
        onClick={handleSwap}
        isLoading={swapPending || isConfirming}
        disabled={!cachedAmounts.fromAmount || !cachedAmounts.toAmount || !routerAddress}
        className="w-full !h-11 text-sm font-extrabold uppercase"
      >
        {isConfirming ? 'Confirming...' : swapPending ? 'Swapping...' : (
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            Swap
          </span>
        )}
      </Button>
    );
  };

  const hasNoRoute = fromToken && toToken && !isLoadingRoute && !route;

  return (
    <div className="flex w-full max-w-md flex-col gap-3 bg-white border-3 border-solid border-black rounded-2xl p-5 brutalist-shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight text-stone-900">
          Swap
        </h2>
        <div className="flex items-center gap-2">
          {/* Encryption Toggle */}
          <button
            type="button"
            onClick={() => setUseEncryption(!useEncryption)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border-2 border-solid px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all hover:translate-y-0.5 active:translate-y-[3px]",
              useEncryption
                ? "bg-primary text-primary-foreground border-primary brutalist-shadow-sm hover:shadow-[1px_1px_0_0_#000]"
                : "bg-stone-100 text-stone-900 border-black hover:bg-stone-200 brutalist-shadow-sm hover:shadow-[1px_1px_0_0_#000]"
            )}
            title={useEncryption ? "BITE Encrypted (on)" : "Not Encrypted (off)"}
          >
            {useEncryption ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          {/* Slippage Settings */}
          <button
            type="button"
            onClick={() => setShowSlippageSettings(!showSlippageSettings)}
            className="flex items-center gap-1.5 rounded-lg border-2 border-solid border-black bg-stone-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-stone-900 brutalist-shadow-sm transition-all hover:bg-stone-200 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] active:shadow-none active:translate-y-[3px] active:translate-x-[3px]"
          >
            <Settings className="h-3.5 w-3.5" />
            {slippage}%
          </button>
        </div>
      </div>

      {/* Slippage Settings */}
      {showSlippageSettings && (
        <div className="bg-stone-100 border-2 border-solid border-black rounded-xl p-4 space-y-3 brutalist-shadow-sm">
          {/* Encryption Mode */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 mb-2">
              Encryption Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseEncryption(true)}
                className={cn(
                  "rounded-lg border-2 border-solid py-2 px-3 text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5",
                  useEncryption
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white text-stone-900 border-black hover:bg-stone-200"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                Encrypted
              </button>
              <button
                type="button"
                onClick={() => setUseEncryption(false)}
                className={cn(
                  "rounded-lg border-2 border-solid py-2 px-3 text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5",
                  !useEncryption
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white text-stone-900 border-black hover:bg-stone-200"
                )}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Standard
              </button>
            </div>
            <p className="text-[9px] text-stone-500 font-medium">
              {useEncryption ? "BITE threshold encryption enabled" : "Standard DEX swap (no encryption)"}
            </p>
          </div>

          {/* Slippage Tolerance */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 mb-2">
              Slippage Tolerance
            </p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSlippage(preset.toString());
                    setShowSlippageSettings(false);
                  }}
                  className={cn(
                    "flex-1 rounded-lg border-2 border-solid py-2 text-xs font-extrabold uppercase tracking-wide transition-all",
                    slippage === preset.toString()
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-stone-900 border-black hover:bg-stone-200 brutalist-shadow-sm"
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Route Warning */}
      {hasNoRoute && (
        <div className="bg-warning/10 border-2 border-solid border-warning rounded-xl p-3 text-xs brutalist-shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <span className="font-extrabold uppercase tracking-wide text-stone-900">
              No route found for {fromToken.symbol} → {toToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Multi-hop Route Info */}
      {route && route.hops > 1 && fromToken && toToken && (
        <div className="bg-accent/10 border-2 border-solid border-accent rounded-xl p-3 text-xs brutalist-shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase tracking-wide text-stone-700">
              Route: {route.hops} hops
            </span>
            <span className="font-bold text-stone-600">
              {fromToken.symbol} → {route.hops === 2 ? '→ ' : ''}{toToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Swap Interface */}
      <div className="space-y-3">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
              From
            </span>
            <div className="flex items-center gap-2">
              {fromUsdPrice && (
                <span className="text-[10px] font-bold text-stone-500">
                  ${safeFixed(fromUsdPrice, 4)}
                </span>
              )}
              {fromBalance && (
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-[10px] font-bold uppercase tracking-wide text-primary hover:underline"
                >
                  Max: {formatBigInt(fromBalance.value, fromBalance.decimals)}
                </button>
              )}
            </div>
          </div>
          <div className="bg-stone-50 border-2 border-solid border-black rounded-xl p-3 space-y-3 brutalist-shadow-sm">
            <TokenSelector
              selectedToken={fromToken}
              onSelect={(token) => {
                setFromToken(token);
                setCachedAmounts({ fromAmount: '', toAmount: '' });
                setEditingField(null);
              }}
              label="Select"
              availableTokens={availableTokens}
            />
            <div className="relative">
              <Input
                type="text"
                placeholder="0.0"
                value={cachedAmounts.fromAmount}
                onChange={(e) => {
                  setCachedAmounts({ fromAmount: e.target.value });
                  setEditingField('from');
                }}
                disabled={!fromToken}
                className="!h-11 !text-lg !font-extrabold bg-white"
                rightElement={<span className="text-xs font-bold text-stone-500">{fromToken?.symbol}</span>}
              />
              {fromUsdValue !== null && (
                <div className="absolute right-16 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {safeFixed(fromUsdValue, 2)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            type="button"
            onClick={handleSwapTokens}
            disabled={!fromToken || !toToken}
            className={cn(
              'rounded-full bg-primary border-2 border-solid border-black p-2.5 text-primary-foreground transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 brutalist-shadow-sm'
            )}
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
              To
            </span>
            {toUsdPrice && (
              <span className="text-[10px] font-bold text-stone-500">
                ${safeFixed(toUsdPrice, 4)}
              </span>
            )}
          </div>
          <div className="bg-stone-50 border-2 border-solid border-black rounded-xl p-3 space-y-3 brutalist-shadow-sm">
            <TokenSelector
              selectedToken={toToken}
              onSelect={(token) => {
                setToToken(token);
                // Keep from amount, recalculate to amount
                if (cachedAmounts.fromAmount) {
                  setEditingField('from');
                } else {
                  setCachedAmounts({ toAmount: '' });
                  setEditingField(null);
                }
              }}
              label="Select"
              availableTokens={availableTokens}
            />
            <div className="relative">
              <Input
                type="text"
                placeholder="0.0"
                value={cachedAmounts.toAmount}
                onChange={(e) => {
                  setCachedAmounts({ toAmount: e.target.value });
                  setEditingField('to');
                }}
                disabled={!toToken}
                className="!h-11 !text-lg !font-extrabold bg-white"
                rightElement={<span className="text-xs font-bold text-stone-500">{toToken?.symbol}</span>}
              />
              {toUsdValue !== null && (
                <div className="absolute right-16 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {safeFixed(toUsdValue, 2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price Display & Trade Value */}
      {(calculatedOutput || (fromUsdValue && toUsdValue)) && (
        <div className="bg-stone-100 border-2 border-solid border-black rounded-xl p-4 brutalist-shadow-sm space-y-3">
          {/* Exchange Rate */}
          {calculatedOutput && fromToken && toToken && cachedAmounts.fromAmount && (() => {
            const fromAmountBigInt = parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18);
            return fromAmountBigInt > 0n;
          })() && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                Rate
              </span>
              <span className="text-xs font-bold text-stone-900">
                1 {fromToken.symbol} = {' '}
                {formatBigInt(
                  (calculatedOutput * BigInt(10 ** (fromToken.decimals ?? 18))) /
                    parseBigInt(cachedAmounts.fromAmount, fromToken.decimals ?? 18),
                  toToken.decimals ?? 18
                )}{' '}
                {toToken.symbol}
              </span>
            </div>
          )}

          {/* Live Prices */}
          <div className="grid grid-cols-2 gap-2">
            {fromUsdPrice && (
              <div className="bg-white border-2 border-stone-300 rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500">{fromToken?.symbol}</p>
                <p className="text-sm font-black text-stone-900">${safeFixed(fromUsdPrice, 4)}</p>
              </div>
            )}
            {toUsdPrice && (
              <div className="bg-white border-2 border-stone-300 rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500">{toToken?.symbol}</p>
                <p className="text-sm font-black text-stone-900">${safeFixed(toUsdPrice, 4)}</p>
              </div>
            )}
          </div>

          {/* Trade USD Value */}
          {fromUsdValue !== null && toUsdValue !== null && (
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600">
                  Trade Value
                </span>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-black text-primary">
                    {safeFixed(fromUsdValue, 2)} → {safeFixed(toUsdValue, 2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="bg-primary/10 border-2 border-solid border-primary rounded-xl p-3 brutalist-shadow-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wide text-stone-900">
              {successMessage}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-error/10 border-2 border-solid border-error rounded-xl p-3 brutalist-shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-error shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wide text-stone-900">
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {actionButton()}

      {/* Approval Info */}
      {needsApproval && allowance !== undefined && allowance > BigInt(0) && (
        <div className="bg-accent/10 border-2 border-solid border-accent rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-700">
            Approve {formatBigInt(allowance, fromToken?.decimals ?? 18)} {fromToken?.symbol} more
          </p>
        </div>
      )}
    </div>
  );
}
