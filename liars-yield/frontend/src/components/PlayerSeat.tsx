"use client";

import { motion } from "framer-motion";
import { formatUnits } from "viem";

interface Challenge {
  id: bigint;
  maker: `0x${string}`;
  wager: bigint;
  claim: string;
  deadline: bigint;
}

interface PlayerSeatProps {
  challenge: Challenge | null;
  currentPlayer: `0x${string}` | undefined;
  onCallBluff: (challengeId: bigint) => void;
}

export function PlayerSeat({ challenge, currentPlayer, onCallBluff }: PlayerSeatProps) {
  if (!challenge) {
    return (
      <div className="bg-emerald-900/30 backdrop-blur rounded-2xl border border-emerald-700/30 p-6">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">🎰</div>
          <div>No active challenge</div>
        </div>
      </div>
    );
  }

  const isMaker = challenge.maker === currentPlayer;
  const blocksLeft = Number(challenge.deadline);
  const timeLeft = blocksLeft > 0 ? `${blocksLeft} blocks` : "Expired";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6"
    >
      {/* Maker Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-bold">
          {challenge.maker.slice(0, 2)}
        </div>
        <div>
          <div className="text-white font-semibold">
            {challenge.maker.slice(0, 6)}...{challenge.maker.slice(-4)}
          </div>
          <div className="text-slate-400 text-sm">
            {isMaker ? "Your Challenge" : "Opponent's Challenge"}
          </div>
        </div>
      </div>

      {/* Claim Card */}
      <div className="bg-gradient-to-br from-rose-500/20 to-purple-500/20 rounded-xl p-4 mb-4 border border-rose-500/30">
        <div className="text-sm text-rose-300 mb-1">Secret Claim:</div>
        <div className="text-2xl font-bold text-white">{challenge.claim}</div>
      </div>

      {/* Wager & Timer */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm text-slate-400">Wager</div>
          <div className="text-xl font-bold text-emerald-400">
            {formatUnits(challenge.wager, 18)} Tokens
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Expires In</div>
          <div className="text-xl font-bold text-amber-400">{timeLeft}</div>
        </div>
      </div>

      {/* Action Button */}
      {!isMaker && blocksLeft > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onCallBluff(challenge.id)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold"
        >
          Call Bluff (Match {formatUnits(challenge.wager, 18)})
        </motion.button>
      )}

      {isMaker && (
        <div className="w-full py-3 rounded-xl border border-slate-600 text-slate-400 text-center">
          Waiting for challenger...
        </div>
      )}
    </motion.div>
  );
}
