"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GameResult {
  gameId: bigint;
  playerA: `0x${string}`;
  playerB: `0x${string}`;
  moveA: number; // 0 = COOPERATE, 1 = DEFECT
  moveB: number;
  payoutA: bigint;
  payoutB: bigint;
}

interface HistoryLogProps {
  results: GameResult[];
}

const MOVE_NAMES = ["COOPERATE", "DEFECT"];
const MOVE_EMOJIS = ["🤝", "🔪"];

export function HistoryLog({ results }: HistoryLogProps) {
  const formatAddress = (addr: `0x${string}`) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getResultText = (result: GameResult) => {
    const moveAName = MOVE_NAMES[result.moveA];
    const moveBName = MOVE_NAMES[result.moveB];
    const moveAEmoji = MOVE_EMOJIS[result.moveA];
    const moveBEmoji = MOVE_EMOJIS[result.moveB];

    if (result.moveA === 0 && result.moveB === 0) {
      return `${formatAddress(result.playerA)} (${moveAName}) ${moveAEmoji} ${formatAddress(result.playerB)} (${moveBName}) ${moveBEmoji} - Trust prevails! Both win 9 Tokens`;
    } else if (result.moveA === 1 && result.moveB === 1) {
      return `${formatAddress(result.playerA)} (${moveAName}) ${moveAEmoji} ${formatAddress(result.playerB)} (${moveBName}) ${moveBEmoji} - Both betrayed! Each gets 4 Tokens`;
    } else if (result.moveA === 0 && result.moveB === 1) {
      return `${formatAddress(result.playerA)} (${moveAName}) ${moveAEmoji} ${formatAddress(result.playerB)} (${moveBName}) ${moveBEmoji} - ${formatAddress(result.playerB)} stole the pot! (+15 Tokens)`;
    } else {
      return `${formatAddress(result.playerA)} (${moveAName}) ${moveAEmoji} ${formatAddress(result.playerB)} (${moveBName}) ${moveBEmoji} - ${formatAddress(result.playerA)} stole the pot! (+15 Tokens)`;
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 max-h-96 overflow-hidden">
      <h3 className="text-lg font-semibold text-white mb-4">Battle Log</h3>

      <div className="space-y-3 overflow-y-auto max-h-72">
        <AnimatePresence initial={false}>
          {results.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No battles yet. Be the first!
            </div>
          ) : (
            results.map((result, index) => (
              <motion.div
                key={`${result.gameId}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <p className="text-sm text-slate-300">{getResultText(result)}</p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
