"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useState } from "react";
import { encryptPosition, encryptShots } from "@/lib/bite/encryption";

interface HunterHudProps {
  queueHider: `0x${string}` | null;
  onHide: (encryptedPos: `0x${string}`) => void;
  onHunt: (gameId: bigint, encryptedShots: `0x${string}`) => void;
  activeGameId?: bigint;
}

export function HunterHud({ queueHider, onHide, onHunt, activeGameId }: HunterHudProps) {
  const { address } = useAccount();
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [selectedShots, setSelectedShots] = useState<number[]>([]);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const isInQueue = queueHider === address;
  const hasOpponent = queueHider !== null && queueHider !== address;

  const handleHidePosition = async () => {
    if (selectedPosition === null || isEncrypting) return;

    setIsEncrypting(true);
    try {
      const rpcUrl = "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE";
      const { encrypted } = await encryptPosition(selectedPosition, rpcUrl);
      onHide(encrypted);
    } catch (error) {
      console.error("Encryption failed:", error);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleSelectShot = (pos: number) => {
    if (selectedShots.includes(pos)) {
      setSelectedShots(selectedShots.filter((p) => p !== pos));
    } else if (selectedShots.length < 2) {
      setSelectedShots([...selectedShots, pos]);
    }
  };

  const handleHunt = async () => {
    if (selectedShots.length !== 2 || activeGameId === undefined || isEncrypting) return;

    setIsEncrypting(true);
    try {
      const rpcUrl = "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE";
      const { encrypted } = await encryptShots(selectedShots[0], selectedShots[1], rpcUrl);
      onHunt(activeGameId, encrypted);
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
      className="space-y-6"
    >
      {/* Status Banner */}
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Grid Hunter</h2>
            <p className="text-slate-400">
              {isInQueue
                ? "Waiting for a hunter..."
                : hasOpponent
                  ? "A hider is waiting! Join as hunter."
                  : "Hide first, then hunt for the target."}
            </p>
          </div>
          <div className="text-4xl">🎯</div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          {!isInQueue && !hasOpponent && (
            <button
              onClick={handleHidePosition}
              disabled={selectedPosition === null || isEncrypting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEncrypting ? "Encrypting..." : "Hide Position (10 Tokens)"}
            </button>
          )}

          {activeGameId && (
            <button
              onClick={handleHunt}
              disabled={selectedShots.length !== 2 || isEncrypting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEncrypting ? "Encrypting..." : "Fire Shots! (10 Tokens)"}
            </button>
          )}
        </div>
      </div>

      {/* Position Selector for Hiding */}
      {!isInQueue && !hasOpponent && !activeGameId && (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Hiding Spot (0-15)</h3>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelectedPosition(i)}
                className={`aspect-square rounded-lg border-2 transition-all ${
                  selectedPosition === i
                    ? "bg-blue-500/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    : "bg-slate-800/20 border-slate-700/50 hover:bg-slate-600/30"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-3">
            Selected: {selectedPosition !== null ? selectedPosition : "None"}
          </p>
        </div>
      )}

      {/* Shot Selector for Hunting */}
      {activeGameId && (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select 2 Shots (0-15)</h3>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => {
              const shotIndex = selectedShots.indexOf(i);
              const isShot = shotIndex !== -1;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectShot(i)}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    isShot
                      ? shotIndex === 0
                        ? "bg-rose-500/30 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                        : "bg-orange-500/30 border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]"
                      : "bg-slate-800/20 border-slate-700/50 hover:bg-slate-600/30"
                  }`}
                >
                  {isShot ? (shotIndex === 0 ? "1️⃣" : "2️⃣") : i}
                </button>
              );
            })}
          </div>
          <p className="text-slate-400 text-sm mt-3">
            Shots: {selectedShots.length}/2 {selectedShots.join(", ") || "None"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
