import { useReadContract, useReadContracts } from "wagmi";
import { useMemo, useCallback } from "react";
import type { Address, Abi } from "viem";
import IERC20ABI from "../../../abi/IERC20.json";

const ERC20_ABI = IERC20ABI.abi as Abi;

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Hook for fetching token symbol
 */
export function useTokenSymbol(tokenAddress: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled:
        !!tokenAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });
}

/**
 * Hook for fetching token name
 */
export function useTokenName(tokenAddress: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "name",
    query: {
      enabled:
        !!tokenAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });
}

/**
 * Hook for fetching token decimals
 */
export function useTokenDecimals(tokenAddress: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled:
        !!tokenAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });
}

/**
 * Hook for fetching complete token info
 */
export function useTokenInfo(tokenAddress: Address | undefined) {
  const { data: symbol } = useTokenSymbol(tokenAddress);
  const { data: name } = useTokenName(tokenAddress);
  const { data: decimals } = useTokenDecimals(tokenAddress);

  // Handle ETH (zero address)
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return {
      data: {
        address: tokenAddress,
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
      },
    };
  }

  return {
    data:
      symbol && name && decimals !== undefined
        ? {
            address: tokenAddress as Address,
            symbol: symbol as string,
            name: name as string,
            decimals: decimals as number,
          }
        : undefined,
  };
}

/**
 * Hook for fetching multiple token infos in a single batch call
 */
export function useMultipleTokenInfo(tokenAddresses: readonly Address[]) {
  const uniqueAddresses = Array.from(
    new Set(
      tokenAddresses.filter(
        (addr) => addr && addr !== "0x0000000000000000000000000000000000000000",
      ),
    ),
  );

  const { data: results } = useReadContracts({
    contracts: uniqueAddresses.flatMap((address) => [
      {
        address,
        abi: ERC20_ABI,
        functionName: "symbol",
      },
      {
        address,
        abi: ERC20_ABI,
        functionName: "name",
      },
      {
        address,
        abi: ERC20_ABI,
        functionName: "decimals",
      },
    ]),
    query: {
      enabled: uniqueAddresses.length > 0,
    },
  });

  const tokenMap = useMemo(() => {
    const map = new Map<Address, TokenInfo>();

    uniqueAddresses.forEach((address, i) => {
      const symbolResult = results?.[i * 3];
      const nameResult = results?.[i * 3 + 1];
      const decimalsResult = results?.[i * 3 + 2];

      if (
        symbolResult?.status === "success" &&
        nameResult?.status === "success" &&
        decimalsResult?.status === "success"
      ) {
        map.set(address, {
          address,
          symbol: symbolResult.result as string,
          name: nameResult.result as string,
          decimals: decimalsResult.result as number,
        });
      }
    });

    return map;
  }, [results, uniqueAddresses]);

  const getTokenInfo = useCallback(
    (address: Address): TokenInfo | undefined => {
      if (address === "0x0000000000000000000000000000000000000000") {
        return {
          address,
          symbol: "ETH",
          name: "Ether",
          decimals: 18,
        };
      }
      return tokenMap.get(address);
    },
    [tokenMap],
  );

  return { getTokenInfo };
}
