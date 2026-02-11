import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { PAIRS, TOKENS } from "@/config/index";

const PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "reserve0", type: "uint112" },
      { internalType: "uint112", name: "reserve1", type: "uint112" },
      { internalType: "uint32", name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface Route {
  path: Address[];
  hops: number;
  estimatedOutput: bigint;
  intermediary?: Address;
}

// Build token graph from PAIRS for routing
interface TokenGraph {
  [token: string]: string[]; // token address -> list of connected token addresses
}

function buildTokenGraph(): TokenGraph {
  const graph: TokenGraph = {};

  for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
    const [token0Symbol, token1Symbol] = pairName.split("_");
    const token0Address = TOKENS[token0Symbol]?.address.toLowerCase();
    const token1Address = TOKENS[token1Symbol]?.address.toLowerCase();

    if (!token0Address || !token1Address) continue;

    if (!graph[token0Address]) graph[token0Address] = [];
    if (!graph[token1Address]) graph[token1Address] = [];

    graph[token0Address].push(token1Address);
    graph[token1Address].push(token0Address);
  }

  return graph;
}

const TOKEN_GRAPH = buildTokenGraph();

// Find all possible routes (up to 2 hops)
function findRoutes(from: Address, to: Address): Address[][] {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  if (fromLower === toLower) return [];

  const routes: Address[][] = [];

  // Direct route (1 hop)
  if (TOKEN_GRAPH[fromLower]?.includes(toLower)) {
    routes.push([from, to]);
  }

  // 2-hop routes
  const intermediaries = TOKEN_GRAPH[fromLower] || [];
  for (const intermediate of intermediaries) {
    if (intermediate === toLower) continue;
    if (TOKEN_GRAPH[intermediate]?.includes(toLower)) {
      routes.push([from, intermediate as Address, to]);
    }
  }

  return routes;
}

function getPairAddress(tokenA: string, tokenB: string): Address | null {
  for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
    const [symbol0, symbol1] = pairName.split("_");
    const addr0 = TOKENS[symbol0]?.address.toLowerCase();
    const addr1 = TOKENS[symbol1]?.address.toLowerCase();

    if (!addr0 || !addr1) continue;

    if (
      (tokenA === addr0 && tokenB === addr1) ||
      (tokenA === addr1 && tokenB === addr0)
    ) {
      return pairAddress;
    }
  }
  return null;
}

async function getOutputForPair(
  pairAddress: Address,
  amountIn: bigint,
  inputToken: Address,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
): Promise<bigint> {
  try {
    const [reserves, token0] = await Promise.all([
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }),
    ]);

    const [reserve0, reserve1] = (
      reserves as readonly [bigint, bigint, unknown]
    ).slice(0, 2) as [bigint, bigint];
    const token0Address = token0 as Address;
    const isToken0Input =
      inputToken.toLowerCase() === token0Address.toLowerCase();
    const reserveIn = isToken0Input ? reserve0 : reserve1;
    const reserveOut = isToken0Input ? reserve1 : reserve0;

    if (reserveIn === 0n || reserveOut === 0n) return 0n;

    // 0.3% fee
    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;

    return numerator / denominator;
  } catch (error) {
    console.error("Error getting output for pair:", pairAddress, error);
    return 0n;
  }
}

async function calculateRouteOutput(
  path: Address[],
  amountIn: bigint,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
): Promise<bigint | null> {
  let currentAmount = amountIn;

  for (let i = 0; i < path.length - 1; i++) {
    const tokenA = path[i];
    const tokenB = path[i + 1];
    const pairAddress = getPairAddress(
      tokenA.toLowerCase(),
      tokenB.toLowerCase(),
    );

    if (!pairAddress) {
      console.error("No pair found for:", tokenA, tokenB);
      return null;
    }

    const output = await getOutputForPair(
      pairAddress,
      currentAmount,
      tokenA,
      publicClient,
    );
    if (output === 0n) {
      console.error("Zero output for pair:", pairAddress);
      return null;
    }
    currentAmount = output;
  }

  return currentAmount;
}

export function useRoute(
  factoryAddress: Address | undefined,
  fromToken: Address | undefined,
  toToken: Address | undefined,
  amountIn: bigint | undefined,
): { route: Route | null; isLoading: boolean; error: string | null } {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (
      !fromToken ||
      !toToken ||
      !amountIn ||
      amountIn === 0n ||
      !publicClient
    ) {
      setRoute(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const findBestRoute = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const routes = findRoutes(fromToken, toToken);

        if (routes.length === 0) {
          setError("No route found between these tokens");
          setRoute(null);
          setIsLoading(false);
          return;
        }

        console.log(
          "Found routes:",
          routes.map((r) => r.map((a) => a.slice(0, 8)).join(" -> ")),
        );

        // Calculate output for each route and pick the best
        let bestRoute: Route | null = null;
        let bestOutput = 0n;

        for (const path of routes) {
          const output = await calculateRouteOutput(
            path,
            amountIn,
            publicClient,
          );

          if (output !== null && output > bestOutput) {
            bestOutput = output;
            bestRoute = {
              path,
              hops: path.length - 1,
              estimatedOutput: output,
              intermediary: path.length === 3 ? path[1] : undefined,
            };
          }
        }

        if (bestRoute) {
          console.log(
            "Best route:",
            bestRoute.path.map((a) => a.slice(0, 8)).join(" -> "),
            "Output:",
            bestRoute.estimatedOutput.toString(),
          );
          setRoute(bestRoute);
        } else {
          setError("No valid route with liquidity found");
          setRoute(null);
        }
      } catch (err) {
        console.error("Route finding error:", err);
        setError("Error calculating route");
        setRoute(null);
      } finally {
        setIsLoading(false);
      }
    };

    findBestRoute();
  }, [fromToken, toToken, amountIn, publicClient]);

  return { route, isLoading, error };
}
