"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface HiddenCardProps {
  isRevealed: boolean;
  secret?: number;
  claim?: string;
  claimMatched?: boolean;
}

export function HiddenCard({ isRevealed, secret, claim, claimMatched }: HiddenCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full h-64 preserve-3d cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Card Back (Hidden) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl border-4 ${
            isRevealed
              ? claimMatched
                ? "border-emerald-500 bg-emerald-900/50"
                : "border-rose-500 bg-rose-900/50"
              : "border-amber-500 bg-gradient-to-br from-amber-900 to-amber-800"
          } flex items-center justify-center`}
        >
          {!isRevealed ? (
            <div className="text-center">
              <div className="text-6xl mb-4">❓</div>
              <div className="text-amber-200 font-semibold">Secret Hidden</div>
              <div className="text-amber-300/60 text-sm mt-2">Click to reveal</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">{claimMatched ? "✅" : "❌"}</div>
              <div className="text-white font-semibold">
                {claimMatched ? "Truth Told!" : "Liar Caught!"}
              </div>
            </div>
          )}
        </div>

        {/* Card Front (Revealed) */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-4 border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-2">Secret Number</div>
            <div className="text-6xl font-bold text-white mb-4">
              {secret !== undefined ? secret : "?"}
            </div>
            {claim && (
              <div className="text-sm text-slate-400">
                Claim was: <span className="text-amber-400 font-semibold">{claim}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
