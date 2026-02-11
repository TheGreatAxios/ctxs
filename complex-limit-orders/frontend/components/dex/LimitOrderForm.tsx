"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import type { Address } from "viem";
import {
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Zap,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import {
  useCreateLimitOrder,
  type LimitOrderParams,
} from "@/lib/hooks/useLimitOrders";
import { useApprove } from "@/lib/hooks/useSwap";
import { useTokenAllowance } from "@/lib/hooks/useContractRead";
import {
  useAllPairsLength,
  useAllPairs,
  useMultiplePoolsInfo,
  type PoolInfo,
} from "@/lib/hooks/usePool";
import { useMultipleTokenInfo } from "@/lib/hooks/useToken";
import { useTokenPrices } from "@/lib/hooks/useCoinbasePrice";
import { parseBigInt, formatBigInt } from "@/lib/utils";
import { formatUnits } from "viem";
import { CONTRACTS, getContractForChain } from "@/config/contracts";
import { TokenSelector } from "@/components/dex/TokenSelector";
import { type TokenInfo } from "@/context/TokenBalancesContext";
import { AVAILABLE_TOKENS } from "@/config/tokens";
import { CHAIN_ID } from "@/config/index";

interface Pool {
  address: Address;
  token0: { symbol: string; address: Address; decimals: number };
  token1: { symbol: string; address: Address; decimals: number };
  liquidityUsd: number;
  liquidityFormatted: string;
  balance0: bigint;
  balance1: bigint;
}

const TARGET_CHAIN_ID = CHAIN_ID;

export function LimitOrderForm() {
  const { address, chainId, chain } = useAccount();
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;

  const { createOrder, isEncrypting, isSigning, isPending, isConfirming } =
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

  // Get USD prices for all tokens
  const tokenPrices = useTokenPrices(uniqueTokens);

  // Build token address -> price map
  const tokenPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    tokenPrices.forEach((priceQuery, idx) => {
      if (priceQuery.data) {
        map.set(uniqueTokens[idx].toLowerCase(), priceQuery.data);
      }
    });
    return map;
  }, [tokenPrices, uniqueTokens]);

  // Get balances for all tokens
  const { data: balancesData } = useReadContracts({
    contracts: uniqueTokens.map((addr) => ({
      address: addr as Address,
      abi: [
        {
          name: "balanceOf",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address as Address],
    })),
    query: { enabled: !!address && uniqueTokens.length > 0 },
  });

  const tokenBalances = useMemo(() => {
    const balances = new Map<Address, bigint>();
    balancesData?.forEach((result, i) => {
      if (result?.status === "success") {
        balances.set(uniqueTokens[i], result.result as unknown as bigint);
      }
    });
    return balances;
  }, [balancesData, uniqueTokens]);

  // Build pool list with liquidity info
  const poolsWithLiquidity = useMemo(() => {
    return poolsData
      .map((pool) => {
        const token0Info = getTokenInfo(pool.token0);
        const token1Info = getTokenInfo(pool.token1);
        if (!token0Info || !token1Info) return null;

        const balance0 = tokenBalances.get(pool.token0) ?? 0n;
        const balance1 = tokenBalances.get(pool.token1) ?? 0n;

        const reserve0Formatted = Number(
          formatUnits(pool.reserves.reserve0, token0Info.decimals),
        );
        const reserve1Formatted = Number(
          formatUnits(pool.reserves.reserve1, token1Info.decimals),
        );
        const price0 = tokenPriceMap.get(pool.token0.toLowerCase()) ?? 0;
        const price1 = tokenPriceMap.get(pool.token1.toLowerCase()) ?? 0;

        const liquidityUsd =
          reserve0Formatted * price0 + reserve1Formatted * price1;
        const liquidityFormatted =
          liquidityUsd > 0
            ? `$${liquidityUsd >= 1000 ? liquidityUsd.toFixed(2) : liquidityUsd.toFixed(4)}`
            : "Low liquidity";

        return {
          address: pool.address,
          token0: {
            symbol: token0Info.symbol,
            address: pool.token0,
            decimals: token0Info.decimals,
          },
          token1: {
            symbol: token1Info.symbol,
            address: pool.token1,
            decimals: token1Info.decimals,
          },
          liquidityUsd,
          liquidityFormatted,
          balance0,
          balance1,
        };
      })
      .filter((p): p is Pool => p !== null)
      .sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  }, [poolsData, getTokenInfo, tokenBalances, tokenPriceMap]);

  // Build token -> pools mapping (normalize addresses to lowercase)
  const tokenToPoolsMap = useMemo(() => {
    const map = new Map<string, Pool[]>();
    poolsWithLiquidity.forEach((pool) => {
      const token0Addr = pool.token0.address.toLowerCase();
      const token1Addr = pool.token1.address.toLowerCase();
      if (!map.has(token0Addr)) map.set(token0Addr, []);
      if (!map.has(token1Addr)) map.set(token1Addr, []);
      map.get(token0Addr)!.push(pool);
      map.get(token1Addr)!.push(pool);
    });
    return map;
  }, [poolsWithLiquidity]);

  // Available tokens for selection
  const availableTokens = useMemo(() => {
    const tokenAddresses = Array.from(tokenToPoolsMap.keys());
    return AVAILABLE_TOKENS.filter((t) =>
      tokenAddresses.includes(t.address.toLowerCase()),
    );
  }, [tokenToPoolsMap]);

  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [paymentToken, setPaymentToken] = useState<Pool | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("24");
  const [needsApproval, setNeedsApproval] = useState(false);

  // Get available pools for selected token (pools we can use to trade this token)
  const availablePools = useMemo(() => {
    if (!selectedToken) return [];
    return tokenToPoolsMap.get(selectedToken.address.toLowerCase()) ?? [];
  }, [selectedToken, tokenToPoolsMap]);

  // Get the "other" token in the selected pool (what we're paying with)
  const otherToken = useMemo(() => {
    if (!paymentToken || !selectedToken) return null;
    return paymentToken.token0.address.toLowerCase() ===
      selectedToken.address.toLowerCase()
      ? paymentToken.token1
      : paymentToken.token0;
  }, [paymentToken, selectedToken]);

  // Determine input token (what we're spending)
  const inputToken = useMemo(() => {
    if (!paymentToken || !selectedToken) return undefined;
    // If buying selectedToken, we spend the other token
    if (direction === "buy") return otherToken?.address;
    // If selling selectedToken, we spend the selected token
    return selectedToken.address;
  }, [paymentToken, selectedToken, direction, otherToken]);

  // Determine input decimals
  const inputDecimals = useMemo(() => {
    if (!paymentToken || !selectedToken) return 18;
    if (direction === "buy") return otherToken?.decimals ?? 18;
    return selectedToken.decimals;
  }, [paymentToken, selectedToken, direction, otherToken]);

  const { data: tokenBalance } = useBalance({
    address,
    token: inputToken,
  });

  const { data: allowance } = useTokenAllowance(
    inputToken ?? ("0x" as Address),
    address ?? ("0x" as Address),
    paymentToken?.address ?? ("0x" as Address),
  );

  const amountBigInt = useMemo(() => {
    return parseBigInt(amount, inputDecimals);
  }, [amount, inputDecimals]);

  // Check if approval is needed
  useEffect(() => {
    const allowanceValue = allowance as bigint | undefined;
    if (allowanceValue != null && amountBigInt > 0n) {
      setNeedsApproval(allowanceValue < amountBigInt);
    } else {
      setNeedsApproval(false);
    }
  }, [allowance, amountBigInt]);

  const handleApprove = async () => {
    if (!address || !inputToken || !paymentToken) return;
    await approve(inputToken, paymentToken.address, amountBigInt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !paymentToken) return;

    const priceBigInt = parseBigInt(targetPrice, 18);

    if (needsApproval) {
      await handleApprove();
      return;
    }

    // Determine correct contract direction based on token position in pair
    // contract direction=true = token0→token1 (sell token0, get token1)
    // contract direction=false = token1→token0 (sell token1, get token0)
    const selectedTokenIsToken0 =
      selectedToken?.address.toLowerCase() ===
      paymentToken.token0.address.toLowerCase();
    // If buying selectedToken: need opposite direction (swap other token for selected)
    // If selling selectedToken: need matching direction (swap selected for other)
    const contractDirection = (direction === "buy") !== selectedTokenIsToken0;

    const params: LimitOrderParams = {
      pool: paymentToken.address,
      targetPrice: priceBigInt,
      amount: amountBigInt,
      direction: contractDirection,
      deadline: BigInt(
        Math.floor(Date.now() / 1000) + parseInt(deadline) * 3600,
      ),
    };

    if (!contracts || !contracts.limitOrderBook) {
      console.error("Limit Order Book not configured");
      return;
    }

    const rpcUrl = chain?.rpcUrls.public.http[0];
    if (!rpcUrl) {
      console.error("RPC URL not configured");
      return;
    }

    try {
      await createOrder(params, rpcUrl, contracts.limitOrderBook, estimatedGas);

      // Clear form on successful submission
      setAmount("");
      setTargetPrice("");
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  const formattedBalance = useMemo(() => {
    if (!tokenBalance) return "0.00";
    return formatBigInt(tokenBalance.value, tokenBalance.decimals);
  }, [tokenBalance]);

  const inputTokenSymbol =
    direction === "buy"
      ? (otherToken?.symbol ?? "token")
      : (selectedToken?.symbol ?? "token");
  const inputTokenInfo = direction === "buy" ? otherToken : selectedToken;

  const estimatedGas = BigInt("10000000000000000");

  if (!factoryAddress) {
    return (
      <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-center font-semibold text-stone-500">
          Switch to SKALE Testnet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-3 border-black brutalist-shadow-lg rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Zap className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-black text-stone-900 tracking-tight uppercase">
          Limit Order
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 flex-1 overflow-y-auto"
      >
        {/* Step 1: Select Token */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Select Token
          </label>
          <TokenSelector
            selectedToken={selectedToken}
            onSelect={(token) => {
              setSelectedToken(token);
              setPaymentToken(null);
            }}
            disabled={availableTokens.length === 0}
            label="Choose token to trade"
            availableTokens={availableTokens}
          />
        </div>

        {/* Step 2: Buy or Sell */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            I want to
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("buy")}
              disabled={!selectedToken}
              className={`flex-1 border-3 border-black rounded-lg px-3 py-3 text-stone-900 font-black uppercase tracking-wider transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed brutalist-shadow ${
                direction === "buy"
                  ? "bg-accent hover:bg-accent/90 shadow-[2px_2px_0_0_#000] translate-y-0"
                  : "bg-white hover:bg-stone-50"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setDirection("sell")}
              disabled={!selectedToken}
              className={`flex-1 border-3 border-black rounded-lg px-3 py-3 text-stone-900 font-black uppercase tracking-wider transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed brutalist-shadow ${
                direction === "sell"
                  ? "bg-accent hover:bg-accent/90 shadow-[2px_2px_0_0_#000] translate-y-0"
                  : "bg-white hover:bg-stone-50"
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Step 3: Payment Token */}
        {selectedToken && (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
              I want to use my
            </label>
            <div className="relative">
              <select
                value={paymentToken?.address ?? ""}
                onChange={(e) => {
                  const pool = availablePools.find(
                    (p) => p.address === e.target.value,
                  );
                  setPaymentToken(pool ?? null);
                }}
                disabled={availablePools.length === 0}
                className="w-full bg-white border-3 border-black rounded-lg px-3 py-3 text-stone-900 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select token...</option>
                {availablePools.map((pool) => {
                  const other =
                    pool.token0.address.toLowerCase() ===
                    selectedToken.address.toLowerCase()
                      ? pool.token1
                      : pool.token0;
                  const balance =
                    pool.token0.address.toLowerCase() ===
                    selectedToken.address.toLowerCase()
                      ? pool.balance1
                      : pool.balance0;
                  const formattedBalance = formatBigInt(
                    balance,
                    other.decimals,
                  );
                  return (
                    <option key={pool.address} value={pool.address}>
                      {other?.symbol ?? "Token"} ({formattedBalance})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>

            {/* Balance & Liquidity Info */}
            {paymentToken && otherToken && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-stone-600">
                    Your {otherToken?.symbol ?? "Token"}:
                  </span>
                  <span className="font-bold text-stone-900">
                    {formattedBalance}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 text-[10px] ${
                    paymentToken.liquidityUsd < 100
                      ? "text-warning"
                      : "text-stone-500"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-semibold">
                    Pool: {paymentToken.liquidityFormatted}
                  </span>
                  {paymentToken.liquidityUsd < 100 && (
                    <span className="font-bold">(Low liquidity)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* When Price Hits */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            When {selectedToken?.symbol ?? "---"} hits
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
              disabled={!paymentToken}
              className="w-full bg-white border-3 border-black rounded-lg pl-10 pr-16 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
              USD
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Amount ({inputTokenSymbol ?? "---"})
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              disabled={!paymentToken}
              className="w-full bg-white border-3 border-black rounded-lg px-3 py-2 pr-16 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-accent/50 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500">
                {inputTokenSymbol ?? "---"}
              </span>
              <button
                type="button"
                onClick={() => setAmount(formattedBalance)}
                disabled={!paymentToken}
                className="text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-wider px-1.5 py-0.5 bg-accent/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
            Order expires in
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
        {needsApproval && amountBigInt > 0n && paymentToken && (
          <div className="bg-warning/10 border-2 border-warning rounded-lg p-3 brutalist-shadow-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  Approval Required
                </p>
                <p className="text-[10px] font-semibold text-stone-600 mt-0.5">
                  Approve {inputTokenSymbol} to continue
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
            !paymentToken ||
            isEncrypting ||
            isSigning ||
            isPending ||
            isConfirming ||
            isApproving
          }
          className={`w-full ${
            needsApproval
              ? "bg-warning hover:bg-warning/90 text-warning-foreground"
              : "bg-accent hover:bg-accent/90 text-accent-foreground"
          } disabled:bg-stone-300 disabled:cursor-not-allowed font-black rounded-lg px-3 py-3 brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest flex items-center justify-center gap-2 text-sm flex-shrink-0`}
        >
          {(isEncrypting ||
            isSigning ||
            isPending ||
            isConfirming ||
            isApproving) && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEncrypting
            ? "Encrypting..."
            : isSigning
              ? "Signing..."
              : isApproving
                ? "Approving..."
                : isPending
                  ? "Submitting..."
                  : isConfirming
                    ? "Confirming..."
                    : needsApproval
                      ? `Approve ${inputTokenSymbol ?? "token"}`
                      : !selectedToken || !paymentToken
                        ? "Place Order"
                        : direction === "buy"
                          ? `Buy ${selectedToken.symbol}`
                          : `Sell ${selectedToken.symbol}`}
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
