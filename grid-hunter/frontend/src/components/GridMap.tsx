"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type CellState = "empty" | "hidden" | "shot1" | "shot2" | "hit" | "miss";

interface GridMapProps {
  mode: "hide" | "hunt" | "reveal";
  playerPositions?: number[];
  shots?: [number, number];
  hiddenPosition?: number;
  onSelectPosition?: (pos: number) => void;
  resolved?: boolean;
}

export function GridMap({
  mode,
  playerPositions = [],
  shots,
  hiddenPosition,
  onSelectPosition,
  resolved = false,
}: GridMapProps) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const getCellState = (index: number): CellState => {
    if (mode === "reveal" && resolved && hiddenPosition !== undefined) {
      if (index === hiddenPosition) return "hit";
      if (shots?.includes(index)) return "miss";
      return "empty";
    }

    if (mode === "hide") {
      return playerPositions.includes(index) ? "hidden" : "empty";
    }

    if (mode === "hunt") {
      if (shots && shots[0] === index) return "shot1";
      if (shots && shots[1] === index) return "shot2";
      return "empty";
    }

    return "empty";
  };

  const getCellColor = (state: CellState) => {
    switch (state) {
      case "hidden":
        return "bg-blue-500/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]";
      case "shot1":
        return "bg-rose-500/30 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]";
      case "shot2":
        return "bg-orange-500/30 border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]";
      case "hit":
        return "bg-emerald-500/50 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)]";
      case "miss":
        return "bg-slate-700/30 border-slate-600";
      default:
        return hoveredCell === index && mode !== "reveal"
          ? "bg-slate-600/30 border-slate-500"
          : "bg-slate-800/20 border-slate-700/50";
    }
  };

  const getCellContent = (state: CellState) => {
    switch (state) {
      case "hidden":
        return "🎯";
      case "shot1":
        return "1️⃣";
      case "shot2":
        return "2️⃣";
      case "hit":
        return "💥";
      case "miss":
        return "❌";
      default:
        return "";
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">
          {mode === "hide" ? "Choose Your Hiding Spot" : mode === "hunt" ? "Pick 2 Shots" : "Reveal"}
        </h3>
        <span className="text-sm text-slate-400">4x4 Grid</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }, (_, i) => {
          const state = getCellState(i);
          const isInteractive = mode === "hide" || mode === "hunt";

          return (
            <motion.button
              key={i}
              whileHover={isInteractive ? { scale: 1.05 } : {}}
              whileTap={isInteractive ? { scale: 0.95 } : {}}
              onMouseEnter={() => setHoveredCell(i)}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={() => onSelectPosition?.(i)}
              disabled={!isInteractive || resolved}
              className={`
                aspect-square rounded-lg border-2 transition-all duration-200
                ${getCellColor(state)}
                ${isInteractive && !resolved ? "cursor-pointer hover:scale-105" : "cursor-default"}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-center justify-center h-full text-2xl">
                {getCellContent(state)}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {mode === "hide" && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-400"></div>
            <span className="text-slate-400">Your Position</span>
          </div>
        )}
        {mode === "hunt" && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/30 border border-rose-400"></div>
              <span className="text-slate-400">Shot 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-400"></div>
              <span className="text-slate-400">Shot 2</span>
            </div>
          </>
        )}
        {mode === "reveal" && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/50 border border-emerald-400"></div>
              <span className="text-slate-400">Hit!</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-700/30 border border-slate-600"></div>
              <span className="text-slate-400">Miss</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
