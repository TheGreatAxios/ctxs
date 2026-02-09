import { useReadContract } from "wagmi";
import type { Address } from "viem";
import ScheduledSwapBookABI from "../../../abi/ScheduledSwapBook.json";
import BiteSwapV2FactoryABI from "../../../abi/BiteSwapV2Factory.json";
import BiteSwapV2PairABI from "../../../abi/BiteSwapV2Pair.json";
import IERC20ABI from "../../../abi/IERC20.json";

const SCHEDULED_SWAP_BOOK_ABI = ScheduledSwapBookABI.abi;
const FACTORY_ABI = BiteSwapV2FactoryABI.abi;
const PAIR_ABI = BiteSwapV2PairABI.abi;
const ERC20_ABI = IERC20ABI.abi;

export function useActiveSwapCount(
  scheduledSwapBookAddress: Address,
  poolAddress: Address,
) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "getActiveSwapCount",
    args: [poolAddress],
    query: {
      enabled:
        !!scheduledSwapBookAddress && scheduledSwapBookAddress !== ("0x" as Address),
    },
  });
}

export function useGetSwaps(
  scheduledSwapBookAddress: Address,
  poolAddress: Address,
) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "getSwaps",
    args: [poolAddress],
    query: {
      enabled:
        !!scheduledSwapBookAddress &&
        scheduledSwapBookAddress !== ("0x" as Address),
    },
  });
}

export function useUserGasBalance(
  scheduledSwapBookAddress: Address,
  userAddress?: Address,
) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "userGasBalance",
    args: [
      userAddress || ("0x0000000000000000000000000000000000000000" as Address),
    ],
    query: {
      enabled:
        !!userAddress &&
        !!scheduledSwapBookAddress &&
        scheduledSwapBookAddress !== ("0x" as Address),
    },
  });
}

export function useCTXGasCost(scheduledSwapBookAddress: Address) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "CTX_GAS_COST",
    query: {
      enabled:
        !!scheduledSwapBookAddress && scheduledSwapBookAddress !== ("0x" as Address),
    },
  });
}

export function useCurrentPrice(
  scheduledSwapBookAddress: Address,
  poolAddress: Address,
) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "currentPrice",
    args: [poolAddress],
    query: {
      enabled:
        !!scheduledSwapBookAddress &&
        scheduledSwapBookAddress !== ("0x" as Address) &&
        !!poolAddress &&
        poolAddress !== ("0x" as Address),
    },
  });
}

export function useUserNonce(
  scheduledSwapBookAddress: Address,
  userAddress?: Address,
) {
  return useReadContract({
    address: scheduledSwapBookAddress,
    abi: SCHEDULED_SWAP_BOOK_ABI,
    functionName: "userNonces",
    args: [
      userAddress || ("0x0000000000000000000000000000000000000000" as Address),
    ],
    query: {
      enabled:
        !!userAddress &&
        !!scheduledSwapBookAddress &&
        scheduledSwapBookAddress !== ("0x" as Address),
    },
  });
}

export function usePair(
  factoryAddress: Address,
  tokenA: Address,
  tokenB: Address,
) {
  return useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [tokenA, tokenB],
  });
}

export function useReserves(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "getReserves",
  });
}

export function useToken0(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "token0",
  });
}

export function useToken1(pairAddress: Address) {
  return useReadContract({
    address: pairAddress,
    abi: PAIR_ABI,
    functionName: "token1",
  });
}

export function useTokenBalance(tokenAddress: Address, walletAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [walletAddress],
  });
}

export function useTokenDecimals(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
}

export function useTokenSymbol(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
}

export function useTokenName(tokenAddress: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "name",
  });
}

export function useTokenAllowance(
  tokenAddress: Address,
  owner: Address,
  spender: Address,
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
    query: {
      refetchInterval: 2000, // Refetch every 2 seconds for faster updates
    },
  });
  return result;
}
