"use client";

import { usePoolInfo, useAddLiquidity } from "@/lib/hooks/usePool";
import { useTokenInfo } from "@/lib/hooks/useToken";
import { useCoinbasePriceById } from "@/lib/hooks/useCoinbasePrice";
import { useAccount, useBalance } from "wagmi";
import { useTokenAllowance } from "@/lib/hooks/useContractRead";
import { useApprove } from "@/lib/hooks/useSwap";
import { formatUnits, parseUnits } from "viem";
import { useState, useEffect, useMemo } from "react";
import { useContracts } from "@/config/contracts";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function formatLargeUSD(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatLargeToken(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(4)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(4)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(4)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(4)}K`;
  return value.toFixed(4);
}

interface PoolDetailProps {
  pairAddress: `0x${string}`;
}

export function PoolDetail({ pairAddress }: PoolDetailProps) {
  const { address } = useAccount();
  const { data: poolInfo, isLoading } = usePoolInfo(pairAddress);

  const { data: userLpBalance } = useBalance({
    address,
    token: pairAddress,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  if (isLoading || !poolInfo) {
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

  const reserve0 = poolInfo.reserves.reserve0;
  const reserve1 = poolInfo.reserves.reserve1;
  const totalSupply = poolInfo.totalSupply;
  const token0 = poolInfo.token0 as `0x${string}`;
  const token1 = poolInfo.token1 as `0x${string}`;

  const userShare = userLpBalance
    ? (Number(userLpBalance.value) / Number(formatUnits(totalSupply, 18))) * 100
    : 0;

  const userReserve0 = userLpBalance
    ? (userLpBalance.value * reserve0) / totalSupply
    : BigInt(0);

  const userReserve1 = userLpBalance
    ? (userLpBalance.value * reserve1) / totalSupply
    : BigInt(0);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-4xl font-black text-stone-900 tracking-tight uppercase">
            {getTokenSymbol(token0)} / {getTokenSymbol(token1)}
          </h1>
          <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest brutalist-shadow rounded-lg">
            Pool
          </span>
        </div>
        <p className="text-stone-500 font-mono text-sm">{pairAddress}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PoolStatsCard
          title="Pool Reserves"
          reserve0={reserve0}
          reserve1={reserve1}
          token0={token0}
          token1={token1}
        />

        <PoolStatsCard title="Total Supply" totalSupply={totalSupply} />

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
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 px-6 rounded-xl brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest"
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setShowRemoveModal(true)}
          disabled={!userLpBalance || userLpBalance.value === BigInt(0)}
          className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black py-4 px-6 rounded-xl brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Remove Liquidity
        </button>
      </div>

      {showAddModal && (
        <AddLiquidityModal
          pairAddress={pairAddress}
          token0={token0}
          token1={token1}
          reserve0={reserve0}
          reserve1={reserve1}
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
    <div className="bg-white border-2 border-black brutalist-shadow rounded-xl p-6">
      <h2 className="text-lg font-black text-stone-900 mb-5 uppercase tracking-widest">
        {title}
      </h2>
      <div className="space-y-4">
        {reserve0 !== undefined && token0 && (
          <div className="flex justify-between items-center">
            <span className="font-semibold text-stone-600 uppercase text-sm tracking-wider">
              {getTokenSymbol(token0)}
            </span>
            <span className="font-black text-stone-900 break-all">
              {formatLargeToken(Number(formatUnits(reserve0, 18)))}
            </span>
          </div>
        )}
        {reserve1 !== undefined && token1 && (
          <div className="flex justify-between items-center">
            <span className="font-semibold text-stone-600 uppercase text-sm tracking-wider">
              {getTokenSymbol(token1)}
            </span>
            <span className="font-black text-stone-900 break-all">
              {formatLargeToken(Number(formatUnits(reserve1, 18)))}
            </span>
          </div>
        )}
        {totalSupply !== undefined && (
          <div className="flex justify-between items-center pt-3 border-t-2 border-stone-200">
            <span className="font-semibold text-stone-600 uppercase text-sm tracking-wider">
              LP Tokens
            </span>
            <span className="font-black text-stone-900 break-all">
              {formatLargeToken(Number(formatUnits(totalSupply, 18)))}
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
    <div className="bg-white border-2 border-black brutalist-shadow rounded-xl p-6">
      <h2 className="text-lg font-black text-stone-900 mb-5 uppercase tracking-widest">
        Your Position
      </h2>

      {!hasPosition ? (
        <p className="text-stone-500 font-medium">
          No liquidity position in this pool
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-stone-600 uppercase text-sm tracking-wider">
              LP Tokens
            </span>
            <span className="font-black text-stone-900 break-all">
              {formatLargeToken(Number(formatUnits(userLpBalance, 18)))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-stone-600 uppercase text-sm tracking-wider">
              Pool Share
            </span>
            <span className="font-black text-primary">
              {userShare.toFixed(4)}%
            </span>
          </div>
          <div className="pt-4 border-t-2 border-stone-200 space-y-3">
            <p className="text-sm font-bold text-stone-600 uppercase tracking-wider">
              Your tokens:
            </p>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-stone-600">
                {getTokenSymbol(token0)}
              </span>
              <span className="font-black text-stone-900 break-all">
                {formatLargeToken(Number(formatUnits(userReserve0, 18)))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-stone-600">
                {getTokenSymbol(token1)}
              </span>
              <span className="font-black text-stone-900 break-all">
                {formatLargeToken(Number(formatUnits(userReserve1, 18)))}
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
  reserve0,
  reserve1,
  onClose,
}: {
  pairAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  reserve0: bigint;
  reserve1: bigint;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const contracts = useContracts();
  const [useEncryption, setUseEncryption] = useState(true); // Default: BITE encrypted
  const { data: token0Info } = useTokenInfo(token0);
  const { data: token1Info } = useTokenInfo(token1);

  const { data: balance0 } = useBalance({ address, token: token0 });
  const { data: balance1 } = useBalance({ address, token: token1 });

  const { data: price0 } = useCoinbasePriceById(
    token0Info?.symbol === "ETH"
      ? "ethereum"
      : token0Info?.symbol === "WETH"
        ? "weth"
        : token0Info?.symbol === "USDC" || token0Info?.symbol === "USDC.e"
          ? "usd-coin"
          : token0Info?.symbol === "USDT"
            ? "tether"
            : token0Info?.symbol === "WBTC"
              ? "wrapped-bitcoin"
              : token0Info?.symbol === "SKL"
                ? "skale"
                : null,
  );
  const { data: price1 } = useCoinbasePriceById(
    token1Info?.symbol === "ETH"
      ? "ethereum"
      : token1Info?.symbol === "WETH"
        ? "weth"
        : token1Info?.symbol === "USDC" || token1Info?.symbol === "USDC.e"
          ? "usd-coin"
          : token1Info?.symbol === "USDT"
            ? "tether"
            : token1Info?.symbol === "WBTC"
              ? "wrapped-bitcoin"
              : token1Info?.symbol === "SKL"
                ? "skale"
                : null,
  );

  // Check allowances for both tokens
  const { data: allowance0Raw } = useTokenAllowance(
    token0,
    address ?? "0x0",
    contracts.router,
  );
  const { data: allowance1Raw } = useTokenAllowance(
    token1,
    address ?? "0x0",
    contracts.router,
  );

  const allowance0 = allowance0Raw as bigint | undefined;
  const allowance1 = allowance1Raw as bigint | undefined;

  const { approve: approve0, isPending: isApproving0 } = useApprove();
  const { approve: approve1, isPending: isApproving1 } = useApprove();
  const { addLiquidity, isPending, isConfirming } = useAddLiquidity();

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [isEditing0, setIsEditing0] = useState(true);

  const r0 = Number(formatUnits(reserve0, token0Info?.decimals ?? 18));
  const r1 = Number(formatUnits(reserve1, token1Info?.decimals ?? 18));

  useEffect(() => {
    if (isEditing0 && amount0 && r0 > 0) {
      const amt0 = parseFloat(amount0);
      if (!isNaN(amt0) && isFinite(amt0)) {
        const amt1 = (amt0 * r1) / r0;
        setAmount1(amt1 > 0 ? amt1.toFixed(6) : "");
      } else {
        setAmount1("");
      }
    }
  }, [amount0, isEditing0, r0, r1]);

  useEffect(() => {
    if (!isEditing0 && amount1 && r1 > 0) {
      const amt1 = parseFloat(amount1);
      if (!isNaN(amt1) && isFinite(amt1)) {
        const amt0 = (amt1 * r0) / r1;
        setAmount0(amt0 > 0 ? amt0.toFixed(6) : "");
      } else {
        setAmount0("");
      }
    }
  }, [amount1, isEditing0, r0, r1]);

  // Check if approvals are needed
  const needsApproval0 = useMemo(() => {
    if (!amount0 || allowance0 === undefined) return true;
    const amount = parseUnits(amount0, token0Info?.decimals ?? 18);
    return allowance0 < amount;
  }, [amount0, allowance0, token0Info?.decimals]);

  const needsApproval1 = useMemo(() => {
    if (!amount1 || allowance1 === undefined) return true;
    const amount = parseUnits(amount1, token1Info?.decimals ?? 18);
    return allowance1 < amount;
  }, [amount1, allowance1, token1Info?.decimals]);

  const needsApproval = needsApproval0 || needsApproval1;

  // Single handler for approvals + add liquidity
  const handleAdd = async () => {
    if (!address || !amount0 || !amount1) return;

    const amt0 = parseUnits(amount0, token0Info?.decimals ?? 18);
    const amt1 = parseUnits(amount1, token1Info?.decimals ?? 18);

    // Approve tokens first if needed
    if (needsApproval0) {
      await approve0(token0, contracts.router, amt0);
    }
    if (needsApproval1) {
      await approve1(token1, contracts.router, amt1);
    }

    // 0.5% slippage tolerance
    const amount0Min = (amt0 * 995n) / 1000n;
    const amount1Min = (amt1 * 995n) / 1000n;

    await addLiquidity(
      contracts.router,
      token0,
      token1,
      amt0,
      amt1,
      amount0Min,
      amount1Min,
      address,
      useEncryption,
    );
  };

  const bal0 = balance0?.value
    ? Number(formatUnits(balance0.value, token0Info?.decimals ?? 18))
    : 0;
  const bal1 = balance1?.value
    ? Number(formatUnits(balance1.value, token1Info?.decimals ?? 18))
    : 0;

  const usd0 = price0 && bal0 > 0 ? bal0 * price0 : null;
  const usd1 = price1 && bal1 > 0 ? bal1 * price1 : null;

  const isValid =
    amount0 &&
    amount1 &&
    parseFloat(amount0) > 0 &&
    parseFloat(amount1) > 0 &&
    parseFloat(amount0) <= bal0 &&
    parseFloat(amount1) <= bal1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-stone-50 border-3 border-black brutalist-shadow-lg rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase">
            Add Liquidity
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
                  : "bg-stone-100 text-stone-900 border-black hover:bg-stone-200 brutalist-shadow-sm hover:shadow-[1px_1px_0_0_#000]",
              )}
              title={
                useEncryption ? "BITE Encrypted (on)" : "Not Encrypted (off)"
              }
            >
              {useEncryption ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-stone-200 hover:bg-stone-300 border-2 border-black rounded-lg font-bold text-stone-900 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Token 0 Input */}
          <div className="bg-white border-2 border-black brutalist-shadow rounded-xl p-4">
            <div className="flex justify-between items-start gap-3 mb-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Token 1
                </p>
                <p className="text-lg font-black text-stone-900 uppercase truncate">
                  {token0Info?.symbol ?? "????"}
                </p>
                <p className="text-[10px] text-stone-400 font-mono">
                  {token0.slice(0, 8)}...{token0.slice(-6)}
                </p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm font-bold text-stone-900 break-all leading-tight">
                  {isFinite(bal0) ? formatLargeToken(bal0) : "0.0000"}
                </p>
                <p className="text-[10px] font-semibold text-stone-500 uppercase">
                  {token0Info?.symbol ?? "????"} Balance
                </p>
                {usd0 !== null && (
                  <p className="text-[10px] font-bold text-emerald-600 break-all leading-tight">
                    {formatLargeUSD(usd0)}
                  </p>
                )}
              </div>
            </div>
            <input
              type="text"
              value={amount0}
              onChange={(e) => {
                setAmount0(e.target.value);
                setIsEditing0(true);
              }}
              onFocus={() => setIsEditing0(true)}
              className="w-full bg-stone-50 border-2 border-black px-3 py-2 text-stone-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold"
              placeholder="0.0"
            />
          </div>

          {/* Token 1 Input */}
          <div className="bg-white border-2 border-black brutalist-shadow rounded-xl p-4">
            <div className="flex justify-between items-start gap-3 mb-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Token 2
                </p>
                <p className="text-lg font-black text-stone-900 uppercase truncate">
                  {token1Info?.symbol ?? "????"}
                </p>
                <p className="text-[10px] text-stone-400 font-mono">
                  {token1.slice(0, 8)}...{token1.slice(-6)}
                </p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm font-bold text-stone-900 break-all leading-tight">
                  {isFinite(bal1) ? formatLargeToken(bal1) : "0.0000"}
                </p>
                <p className="text-[10px] font-semibold text-stone-500 uppercase">
                  {token1Info?.symbol ?? "????"} Balance
                </p>
                {usd1 !== null && (
                  <p className="text-[10px] font-bold text-emerald-600 break-all leading-tight">
                    {formatLargeUSD(usd1)}
                  </p>
                )}
              </div>
            </div>
            <input
              type="text"
              value={amount1}
              onChange={(e) => {
                setAmount1(e.target.value);
                setIsEditing0(false);
              }}
              onFocus={() => setIsEditing0(false)}
              className="w-full bg-stone-50 border-2 border-black px-3 py-2 text-stone-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold"
              placeholder="0.0"
            />
          </div>

          {/* Pool Ratio Info */}
          {r0 > 0 && r1 > 0 && (
            <div className="bg-stone-100 border-2 border-stone-300 rounded-lg p-3">
              <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Pool Ratio: 1 {token0Info?.symbol ?? "????"} ={" "}
                {(r1 / r0).toFixed(6)} {token1Info?.symbol ?? "????"}
              </p>
            </div>
          )}

          {/* Single Add Liquidity button */}
          <button
            onClick={handleAdd}
            disabled={
              !isValid ||
              isPending ||
              isConfirming ||
              isApproving0 ||
              isApproving1
            }
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 px-6 rounded-xl brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming
              ? "Adding Liquidity..."
              : isApproving0 || isApproving1
                ? "Approving..."
                : "Add Liquidity"}
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
  const [amount, setAmount] = useState("");

  const handleRemove = () => {
    // TODO: Implement remove liquidity logic
    console.log("Remove liquidity:", { amount });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-stone-50 border-3 border-black brutalist-shadow-lg rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase">
            Remove Liquidity
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-stone-200 hover:bg-stone-300 border-2 border-black rounded-lg font-bold text-stone-900 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 uppercase tracking-wider">
              LP Token Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white border-3 border-black px-4 py-3 text-stone-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-secondary/50 font-semibold"
              placeholder="0.0"
            />
            <p className="text-xs font-semibold text-stone-500 mt-2">
              Available: {formatUnits(lpBalance, 18)} LP
            </p>
          </div>

          <button
            onClick={handleRemove}
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black py-4 px-6 rounded-xl brutalist-shadow transition-all hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 uppercase tracking-widest"
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
    "0x0000000000000000000000000000000000000000": "ETH",
  };
  return tokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 6);
}
