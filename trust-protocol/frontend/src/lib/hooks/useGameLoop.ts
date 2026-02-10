"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";

const TRUST_GAME_ABI = [
  parseAbiItem("event GameJoined(address indexed player, uint256 indexed gameId)"),
  parseAbiItem("event GameStarted(uint256 indexed gameId, address indexed playerA, address indexed playerB)"),
  parseAbiItem("event GameResult(uint256 indexed gameId, address indexed playerA, address indexed playerB, uint8 moveA, uint8 moveB, uint256 payoutA, uint256 payoutB)"),
];

interface GameResult {
  gameId: bigint;
  playerA: `0x${string}`;
  playerB: `0x${string}`;
  moveA: number;
  moveB: number;
  payoutA: bigint;
  payoutB: bigint;
}

interface UseGameLoopProps {
  contractAddress: `0x${string}`;
  fromBlock?: bigint;
}

export function useGameLoop({ contractAddress, fromBlock }: UseGameLoopProps) {
  const [queuePlayer, setQueuePlayer] = useState<`0x${string}` | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      if (!publicClient) return;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock = fromBlock || currentBlock - 1000n;

        // Fetch GameStarted events to determine current queue
        const gameStartedLogs = await publicClient.getLogs({
          address: contractAddress,
          event: TRUST_GAME_ABI[1],
          fromBlock: startBlock,
          toBlock: "latest",
        });

        // Fetch GameResult events
        const gameResultLogs = await publicClient.getLogs({
          address: contractAddress,
          event: TRUST_GAME_ABI[2],
          fromBlock: startBlock,
          toBlock: "latest",
        });

        if (!mounted) return;

        // Process results (most recent first)
        const processedResults = gameResultLogs.map((log) => ({
          gameId: log.args.gameId as bigint,
          playerA: log.args.playerA as `0x${string}`,
          playerB: log.args.playerB as `0x${string}`,
          moveA: Number(log.args.moveA),
          moveB: Number(log.args.moveB),
          payoutA: log.args.payoutA as bigint,
          payoutB: log.args.payoutB as bigint,
        })).reverse();

        setResults(processedResults);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        if (mounted) setIsLoading(false);
      }
    };

    fetchEvents();

    // Poll every 2 seconds for new events
    const interval = setInterval(fetchEvents, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [contractAddress, publicClient, fromBlock]);

  return { queuePlayer, results, isLoading };
}
