'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Search, ChevronDown } from 'lucide-react';
import { cn, shortenAddress, formatBigInt } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { useCoinbasePrice } from '@/lib/hooks/useCoinbasePrice';

export interface TokenInfo {
  address: `0x${string}`;
  symbol?: string;
  decimals?: number;
  logoURI?: string;
  coinbaseId?: string;
}

interface TokenSelectorProps {
  selectedToken: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  onClear?: () => void;
  disabled?: boolean;
  label?: string;
  availableTokens?: TokenInfo[];
  chainId?: number;
}

interface TokenWithBalance extends TokenInfo {
  balance?: {
    decimals: number;
    formatted: string;
    symbol: string;
    value: bigint;
  };
  balanceFormatted?: string;
  usdPrice?: number | null;
  usdValue?: number;
}

export function TokenSelector({
  selectedToken,
  onSelect,
  disabled = false,
  label = 'Select token',
  availableTokens = [],
  chainId,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { address: walletAddress } = useAccount();

  // Fetch balance for selected token (for display on button)
  const { data: selectedBalance } = useBalance({
    address: walletAddress,
    token: selectedToken?.address === '0x0000000000000000000000000000000000000000'
      ? undefined
      : selectedToken?.address,
  });

  // Fetch USD price for selected token
  const { data: selectedUsdPrice } = useCoinbasePrice(selectedToken?.coinbaseId);

  // Fetch all token balances and prices for ranking
  const [sortedTokens, setSortedTokens] = useState<TokenInfo[]>(availableTokens);

  // Filter tokens by search query
  const filteredTokens = useMemo(() => {
    const toFilter = searchQuery ? sortedTokens : availableTokens;

    if (!searchQuery) return toFilter;

    const query = searchQuery.toLowerCase();
    return toFilter.filter((token) => {
      return (
        token.symbol?.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    });
  }, [availableTokens, sortedTokens, searchQuery]);

  const handleSelect = useCallback(
    (token: TokenInfo) => {
      onSelect(token);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  // Calculate USD value for display
  const selectedUsdValue = useMemo(() => {
    if (!selectedBalance || !selectedUsdPrice) return null;
    const balance = parseFloat(formatBigInt(selectedBalance.value, selectedBalance.decimals));
    return balance * selectedUsdPrice;
  }, [selectedBalance, selectedUsdPrice]);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          'flex h-14 w-full items-center justify-between rounded-xl border-3 border-black bg-white px-4 text-stone-900 transition-all hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:-translate-y-0'
        )}
      >
        <div className="flex items-center gap-3">
          {selectedToken ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black overflow-hidden bg-white">
                {(() => {
                  const iconUrl = getTokenIconUrl(selectedToken.symbol);
                  const bgColor = getTokenColor(selectedToken.symbol);
                  return iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={selectedToken.symbol ?? 'Token'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null;
                })()}
                <span
                  className="text-lg font-black text-white hidden"
                  style={{ backgroundColor: getTokenColor(selectedToken.symbol) }}
                >
                  {selectedToken.symbol?.slice(0, 2) ?? '??'}
                </span>
              </div>
              <div className="text-left">
                <div className="font-black uppercase tracking-wider">{selectedToken.symbol}</div>
                {selectedBalance && (
                  <div className="text-xs font-semibold text-stone-500">
                    {formatBigInt(selectedBalance.value, selectedBalance.decimals)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="font-semibold text-stone-500">{label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedToken && selectedUsdValue !== null && (
            <div className="text-right">
              <div className="text-sm font-black text-stone-900">
                ${selectedUsdValue.toFixed(2)}
              </div>
            </div>
          )}
          <ChevronDown className="h-5 w-5 text-stone-500" />
        </div>
      </button>

      {/* Token Selection Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select a token"
        className="max-h-[80vh]"
      >
        <div className="p-4">
          {/* Search Input */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-3 border-black bg-white py-3 pl-10 pr-4 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-primary/50 font-semibold"
              autoFocus
            />
          </div>

          {/* Token List */}
          <TokenList
            tokens={filteredTokens}
            walletAddress={walletAddress}
            onSelect={handleSelect}
            searchQuery={searchQuery}
          />
        </div>
      </Dialog>
    </>
  );
}

// Token List with balance ranking
function TokenList({
  tokens,
  walletAddress,
  onSelect,
  searchQuery,
}: {
  tokens: TokenInfo[];
  walletAddress?: string;
  onSelect: (token: TokenInfo) => void;
  searchQuery: string;
}) {
  // Fetch all balances and prices
  const tokensWithData = tokens.map((token) => {
    const { data: balance } = useBalance({
      address: walletAddress as `0x${string}` | undefined,
      token: token.address === '0x0000000000000000000000000000000000000000'
        ? undefined
        : token.address,
    });

    const { data: usdPrice } = useCoinbasePrice(token.coinbaseId);

    const balanceFormatted = balance
      ? formatBigInt(balance.value, balance.decimals)
      : '0';

    const usdValue =
      balance && usdPrice
        ? parseFloat(balanceFormatted) * usdPrice
        : 0;

    return {
      ...token,
      balance,
      balanceFormatted,
      usdPrice,
      usdValue,
    };
  });

  // Sort by USD value (highest first), unless searching
  const sortedTokens = useMemo(() => {
    if (searchQuery) return tokensWithData;

    return [...tokensWithData].sort((a, b) => {
      const aValue = a.usdValue ?? 0;
      const bValue = b.usdValue ?? 0;
      return bValue - aValue;
    });
  }, [tokensWithData, searchQuery]);

  if (sortedTokens.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-semibold text-stone-500">
        No tokens found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sortedTokens.map((token) => (
        <TokenListItem
          key={token.address}
          token={token}
          onSelect={() => onSelect(token)}
        />
      ))}
    </div>
  );
}

// Get token icon URL from public CDN
function getTokenIconUrl(symbol?: string): string | undefined {
  if (!symbol) return undefined;

  // Map token symbols to their icon URLs
  const iconMap: Record<string, string> = {
    USDC: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    USDT: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    WBTC: 'https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
    WETH: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    ETH: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    FAI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png', // Fallback to USDC
  };

  return iconMap[symbol.toUpperCase()];
}

// Get token background color for fallback icon
function getTokenColor(symbol?: string): string {
  if (!symbol) return '#6366f1'; // default indigo

  const colorMap: Record<string, string> = {
    USDC: '#2775CA',
    USDT: '#26A17B',
    WBTC: '#F7931A',
    WETH: '#627EEA',
    ETH: '#627EEA',
  };

  return colorMap[symbol.toUpperCase()] || '#6366f1';
}

// Token List Item Component
function TokenListItem({
  token,
  onSelect,
}: {
  token: TokenWithBalance;
  onSelect: () => void;
}) {
  const iconUrl = getTokenIconUrl(token.symbol);
  const bgColor = getTokenColor(token.symbol);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border-2 border-transparent p-3 text-left transition-all hover:border-stone-300 hover:bg-stone-100 active:scale-95"
    >
      {/* Token Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-black overflow-hidden bg-white">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={token.symbol ?? 'Token'}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to text if image fails
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className="text-lg font-black text-white hidden"
          style={{ backgroundColor: bgColor }}
        >
          {token.symbol?.slice(0, 2) ?? '??'}
        </span>
      </div>

      {/* Token Info */}
      <div className="flex flex-1 items-center justify-between">
        <div>
          <div className="font-black text-stone-900 uppercase tracking-wider">{token.symbol}</div>
          <div className="text-xs font-semibold text-stone-500 font-mono">
            {shortenAddress(token.address)}
          </div>
        </div>

        {/* Balance & USD Value */}
        <div className="text-right">
          <div className="font-black text-stone-900">
            {token.balanceFormatted ?? '0'}
          </div>
          {token.usdValue !== undefined && token.usdValue > 0 && (
            <div className="text-xs font-semibold text-stone-500">
              ${token.usdValue.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
