"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useState } from "react";
import { encryptMove } from "@/lib/bite/encryption";

type MoveType = "COOPERATE" | "DEFECT" | null;

interface ArenaCardProps {
  queuePlayer: `0x${string}` | null;
  onJoinGame: (encryptedMove: `0x${string}`) => void;
}

export function ArenaCard({ queuePlayer, onJoinGame }: ArenaCardProps) {
  const { address } = useAccount();
  const [selectedMove, setSelectedMove] = useState<MoveType>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const isInQueue = queuePlayer === address;
  const hasOpponent = queuePlayer !== null && queuePlayer !== address;

  const handleJoinGame = async () => {
    if (!selectedMove || isEncrypting) return;

    setIsEncrypting(true);
    try {
      const rpcUrl = "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE";
      const { encryptedMove } = await encryptMove(selectedMove, rpcUrl);
      onJoinGame(encryptedMove);
    } catch (error) {
      console.error("Encryption failed:", error);
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        {/* Player A */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 mb-2 flex items-center justify-center text-2xl font-bold">
            {address?.slice(0, 2)}
          </div>
          <span className="text-slate-300 text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-slate-400">VS</div>

        {/* Player B */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 mb-2 flex items-center justify-center text-2xl font-bold">
            {queuePlayer ? "?" : "..."}
          </div>
          <span className="text-slate-300 text-sm">
            {hasOpponent
              ? `${queuePlayer?.slice(0, 6)}...${queuePlayer?.slice(-4)}`
              : "Waiting..."}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        {isInQueue ? (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse" />
            In Queue
          </span>
        ) : hasOpponent ? (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400">
            Opponent Found!
          </span>
        ) : (
          <span className="text-slate-400">Select your move to join</span>
        )}
      </div>

      {/* Move Selection */}
      {!isInQueue && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedMove("COOPERATE")}
            disabled={hasOpponent || isEncrypting}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMove === "COOPERATE"
                ? "border-emerald-500 bg-emerald-500/20"
                : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
            } ${hasOpponent ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-3xl mb-2">🤝</div>
            <div className="font-semibold text-white">COOPERATE</div>
            <div className="text-xs text-slate-400 mt-1">Trust your opponent</div>
          </button>

          <button
            onClick={() => setSelectedMove("DEFECT")}
            disabled={hasOpponent || isEncrypting}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMove === "DEFECT"
                ? "border-rose-500 bg-rose-500/20"
                : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
            } ${hasOpponent ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-3xl mb-2">🔪</div>
            <div className="font-semibold text-white">DEFECT</div>
            <div className="text-xs text-slate-400 mt-1">Betray for profit</div>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center">
        {!isInQueue && !hasOpponent && (
          <button
            onClick={handleJoinGame}
            disabled={!selectedMove || isEncrypting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEncrypting ? "Encrypting..." : "Join Queue"}
          </button>
        )}

        {!isInQueue && hasOpponent && selectedMove && (
          <button
            onClick={handleJoinGame}
            disabled={isEncrypting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold animate-pulse"
          >
            {isEncrypting ? "Encrypting..." : "Start Battle!"}
          </button>
        )}

        {isInQueue && (
          <button className="px-8 py-3 rounded-xl border border-slate-600 text-slate-400">
            Leave Queue
          </button>
        )}
      </div>
    </motion.div>
  );
}
