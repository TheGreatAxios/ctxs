import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import ConfidentialLimitOrderBookABI from '../../../abi/ConfidentialLimitOrderBook.json';
import BiteSwapV2FactoryABI from '../../../abi/BiteSwapV2Factory.json';
import BiteSwapV2PairABI from '../../../abi/BiteSwapV2Pair.json';
import IERC20ABI from '../../../abi/IERC20.json';

const LIMIT_ORDER_BOOK_ABI = ConfidentialLimitOrderBookABI.abi;
const FACTORY_ABI = BiteSwapV2FactoryABI.abi;
const PAIR_ABI = BiteSwapV2PairABI.abi;
const ERC20_ABI = IERC20ABI.abi;

export function useOrderCount(
  limitOrderBookAddress: Address,
  poolAddress: Address
) {
  return useReadContract({
    address: limitOrderBookAddress,
    abi: LIMIT_ORDER_BOOK_ABI,
    functionName: 'getOrderCount',
    args: [poolAddress],
    query: {
      enabled: !!limitOrderBookAddress && limitOrderBookAddress !== '0x' as Address,
    },
  });
}

export function useOrder(
  limitOrderBookAddress: Address,
  poolAddress: Address,
  orderId: bigint
) {
  return useReadContract({
    address: limitOrderBookAddress,
    abi: LIMIT_ORDER_BOOK_ABI,
    functionName: 'getOrder',
    args: [poolAddress, orderId],
    query: {
      enabled: !!limitOrderBookAddress && limitOrderBookAddress !== '0x' as Address && orderId >= 0n,
    },
  });
}

export function useUserGasBalance(
  limitOrderBookAddress: Address,
  userAddress?: Address
) {
  return useReadContract({
    address: limitOrderBookAddress,
    abi: LIMIT_ORDER_BOOK_ABI,
    functionName: 'userGasBalance',
    args: [userAddress || '0x0000000000000000000000000000000000000000' as Address],
    query: {
      enabled: !!userAddress && !!limitOrderBookAddress && limitOrderBookAddress !== '0x' as Address,
    },
  });
}

export function useCTXGasCost(limitOrderBookAddress: Address) {
  return useReadContract({
    address: limitOrderBookAddress,
    abi: LIMIT_ORDER_BOOK_ABI,
    functionName: 'CTX_GAS_COST',
    query: {
      enabled: !!limitOrderBookAddress && limitOrderBookAddress !== '0x' as Address,
    },
  });
}

export function useFactoryAddress(limitOrderBookAddress: Address) {
  return useReadContract({
    address: limitOrderBookAddress,
    abi: LIMIT_ORDER_BOOK_ABI,
    functionName: 'factory',
    query: {
      enabled: !!limitOrderBookAddress && limitOrderBookAddress !== '0x' as Address,
    },
  });
}

export function usePair(factoryAddress: Address, tokenA: Address, tokenB: Address) {
  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getPair',
    args: [tokenA, tokenB],
  });
}

export function useReserves(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'getReserves',
  });
}

export function useToken0(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'token0',
  });
}

export function useToken1(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: 'token1',
  });
}

export function useTokenBalance(tokenAddress: Address, walletAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
}

export function useTokenDecimals(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });
}

export function useTokenSymbol(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });
}

export function useTokenName(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
  });
}

export function useTokenAllowance(
  tokenAddress: Address,
  owner: Address,
  spender: Address
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });
}
