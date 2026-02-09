import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { PAIRS, TOKENS } from '@/config/index';

const PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: 'reserve0', type: 'uint112' },
      { internalType: 'uint112', name: 'reserve1', type: 'uint112' },
      { internalType: 'uint32', name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface Route {
  path: Address[];
  hops: number;
  estimatedOutput: bigint;
}

// All possible routes derived from PAIRS config
const TOKEN_ADDRESSES = Object.values(TOKENS).map(t => t.address.toLowerCase());

// Build route map from PAIRS config: pairAddress -> {token0, token1}
const PAIR_MAP = new Map<string, {token0: Address; token1: Address}>();
Object.entries(PAIRS).forEach(([_, address]) => {
  PAIR_MAP.set(address.toLowerCase(), { token0: '' as Address, token1: '' as Address });
});

// Build token graph from PAIRS for 2-hop routing
function findRoute(from: Address, to: Address): Address[] | null {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  if (fromLower === toLower) return null;

  // Check for direct pair by looking through PAIRS
  for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
    const [token0Symbol, token1Symbol] = pairName.split('_');
    const token0Address = TOKENS[token0Symbol]?.address.toLowerCase();
    const token1Address = TOKENS[token1Symbol]?.address.toLowerCase();

    if (!token0Address || !token1Address) continue;

    if ((fromLower === token0Address && toLower === token1Address) ||
        (fromLower === token1Address && toLower === token0Address)) {
      return [from, to];
    }
  }

  // Check for 2-hop route via intermediate token
  for (const intermediate of TOKEN_ADDRESSES) {
    if (intermediate === fromLower || intermediate === toLower) continue;

    // Check if from -> intermediate exists
    const fromToIntermediate = hasDirectPair(fromLower, intermediate);
    // Check if intermediate -> to exists
    const intermediateToTo = hasDirectPair(intermediate, toLower);

    if (fromToIntermediate && intermediateToTo) {
      return [from, intermediate as Address, to];
    }
  }

  return null;
}

function hasDirectPair(tokenA: string, tokenB: string): boolean {
  for (const [pairName, _] of Object.entries(PAIRS)) {
    const [symbol0, symbol1] = pairName.split('_');
    const addr0 = TOKENS[symbol0]?.address.toLowerCase();
    const addr1 = TOKENS[symbol1]?.address.toLowerCase();

    if (!addr0 || !addr1) continue;

    if ((tokenA === addr0 && tokenB === addr1) ||
        (tokenA === addr1 && tokenB === addr0)) {
      return true;
    }
  }
  return false;
}

function getPairAddress(tokenA: string, tokenB: string): Address | null {
  for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
    const [symbol0, symbol1] = pairName.split('_');
    const addr0 = TOKENS[symbol0]?.address.toLowerCase();
    const addr1 = TOKENS[symbol1]?.address.toLowerCase();

    if (!addr0 || !addr1) continue;

    if ((tokenA === addr0 && tokenB === addr1) ||
        (tokenA === addr1 && tokenB === addr0)) {
      return pairAddress;
    }
  }
  return null;
}

async function getOutputForPair(
  pairAddress: Address,
  amountIn: bigint,
  inputToken: Address,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>
): Promise<bigint> {
  try {
    const [reserves, token0] = await Promise.all([
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves',
      }),
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token0',
      }),
    ]);

    const [reserve0, reserve1] = (reserves as readonly [bigint, bigint, unknown]).slice(0, 2) as [bigint, bigint];
    const token0Address = token0 as Address;
    const isToken0Input = inputToken.toLowerCase() === token0Address.toLowerCase();
    const reserveIn = isToken0Input ? reserve0 : reserve1;
    const reserveOut = isToken0Input ? reserve1 : reserve0;

    if (reserveIn === 0n || reserveOut === 0n) return 0n;

    // 0.3% fee
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;

    return numerator / denominator;
  } catch {
    return 0n;
  }
}

export function useRoute(
  factoryAddress: Address | undefined,
  fromToken: Address | undefined,
  toToken: Address | undefined,
  amountIn: bigint | undefined
): { route: Route | null; isLoading: boolean } {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!fromToken || !toToken || !amountIn || !publicClient) {
      setRoute(null);
      setIsLoading(false);
      return;
    }

    const calculateRoute = async () => {
      setIsLoading(true);

      // Type guard for TypeScript
      const client = publicClient;

      const path = findRoute(fromToken, toToken);

      if (!path) {
        setRoute(null);
        setIsLoading(false);
        return;
      }

      // Calculate output through the path
      let currentAmount = amountIn;
      let validRoute = true;

      for (let i = 0; i < path.length - 1; i++) {
        const tokenA = path[i];
        const tokenB = path[i + 1];
        const pairAddress = getPairAddress(tokenA, tokenB);

        if (!pairAddress) {
          validRoute = false;
          break;
        }

        const output = await getOutputForPair(pairAddress, currentAmount, tokenA, client);
        if (output === 0n) {
          validRoute = false;
          break;
        }
        currentAmount = output;
      }

      if (validRoute && currentAmount > 0n) {
        setRoute({
          path,
          hops: path.length - 1,
          estimatedOutput: currentAmount,
        });
      } else {
        setRoute(null);
      }

      setIsLoading(false);
    };

    calculateRoute();
  }, [fromToken, toToken, amountIn, publicClient]);

  return { route, isLoading };
}
