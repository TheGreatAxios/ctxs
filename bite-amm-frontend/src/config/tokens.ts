import type { TokenInfo } from '@/components/dex/TokenSelector';

export const TOKENS: Record<string, TokenInfo> = {
  SKL: {
    address: (process.env.NEXT_PUBLIC_SKL_ADDRESS ?? '0xaf2000000000000000000000000000000000057b') as `0x${string}`,
    symbol: 'SKL',
    decimals: 18,
    coinbaseId: 'skale',
  },
  USDC: {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x2e0000000000000000000000000000000000000bD') as `0x${string}`,
    symbol: 'USDC.e',
    decimals: 6,
    coinbaseId: 'usd-coin',
  },
  USDT: {
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? '0x3ca000000000000000000000000000000000000bf') as `0x${string}`,
    symbol: 'USDT',
    decimals: 6,
    coinbaseId: 'tether',
  },
  WBTC: {
    address: (process.env.NEXT_PUBLIC_WBTC_ADDRESS ?? '0x45100000000000000000000000000000000000e87') as `0x${string}`,
    symbol: 'WBTC',
    decimals: 8,
    coinbaseId: 'wrapped-bitcoin',
  },
  WETH: {
    address: (process.env.NEXT_PUBLIC_WETH_ADDRESS ?? '0xf9400000000000000000000000000000000000fc0') as `0x${string}`,
    symbol: 'WETH',
    decimals: 6,
    coinbaseId: 'weth',
  },
  ETH: {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    symbol: 'ETH',
    decimals: 18,
    coinbaseId: 'ethereum',
  },
};

export const AVAILABLE_TOKENS = Object.values(TOKENS);
