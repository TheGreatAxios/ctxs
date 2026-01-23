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
  // Each TokenListItem will fetch its own balance, then we collect and sort
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
          'flex h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-foreground transition-all hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <div className="flex items-center gap-3">
          {selectedToken ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {selectedToken.symbol?.slice(0, 2) ?? '??'}
              </div>
              <div className="text-left">
                <div className="font-semibold">{selectedToken.symbol}</div>
                {selectedBalance && (
                  <div className="text-sm text-muted-foreground">
                    {formatBigInt(selectedBalance.value, selectedBalance.decimals)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedToken && selectedUsdValue !== null && (
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                ${selectedUsdValue.toFixed(2)}
              </div>
            </div>
          )}
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
      <div className="py-8 text-center text-sm text-muted-foreground">
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

// Token List Item Component
function TokenListItem({
  token,
  onSelect,
}: {
  token: TokenWithBalance;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
    >
      {/* Token Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
        {token.symbol?.slice(0, 2) ?? '??'}
      </div>

      {/* Token Info */}
      <div className="flex flex-1 items-center justify-between">
        <div>
          <div className="font-medium text-foreground">{token.symbol}</div>
          <div className="text-xs text-muted-foreground">
            {shortenAddress(token.address)}
          </div>
        </div>

        {/* Balance & USD Value */}
        <div className="text-right">
          <div className="font-medium text-foreground">
            {token.balanceFormatted ?? '0'}
          </div>
          {token.usdValue !== undefined && token.usdValue > 0 && (
            <div className="text-xs text-muted-foreground">
              ${token.usdValue.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
