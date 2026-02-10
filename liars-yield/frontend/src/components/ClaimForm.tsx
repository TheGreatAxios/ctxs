"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { parseUnits } from "viem";
import { encryptSecret } from "@/lib/bite/encryption";

interface ClaimFormProps {
  onSubmit: (encryptedSecret: `0x${string}`, wager: bigint, claim: string) => void;
}

export function ClaimForm({ onSubmit }: ClaimFormProps) {
  const [secret, setSecret] = useState<number>(50);
  const [wager, setWager] = useState<string>("10");
  const [operator, setOperator] = useState<string>(">");
  const [claimValue, setClaimValue] = useState<string>("50");
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleSubmit = async () => {
    if (isEncrypting) return;

    setIsEncrypting(true);
    try {
      const rpcUrl = "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE";
      const { encryptedSecret } = await encryptSecret(secret, rpcUrl);

      const claim = `${operator} ${claimValue}`;
      const wagerAmount = parseUnits(wager, 18);

      onSubmit(encryptedSecret, wagerAmount, claim);
    } catch (error) {
      console.error("Encryption failed:", error);
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
      <h3 className="text-xl font-bold text-white mb-6">Create Your Challenge</h3>

      {/* Secret Input */}
      <div className="mb-6">
        <label className="block text-slate-300 mb-2">Your Secret Number (0-100)</label>
        <input
          type="range"
          min="0"
          max="100"
          value={secret}
          onChange={(e) => setSecret(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="text-center text-3xl font-bold text-amber-400 mt-2">{secret}</div>
      </div>

      {/* Claim Builder */}
      <div className="mb-6">
        <label className="block text-slate-300 mb-2">Your Claim About the Secret</label>
        <div className="flex items-center gap-2 mb-3">
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
          >
            <option value=">">Greater than</option>
            <option value="<">Less than</option>
            <option value=">=">At least</option>
            <option value="<=">At most</option>
            <option value="==">Equals</option>
          </select>
          <input
            type="number"
            min="0"
            max="100"
            value={claimValue}
            onChange={(e) => setClaimValue(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div className="text-center py-3 rounded-lg bg-rose-500/20 border border-rose-500/30">
          <span className="text-rose-300">Your claim:</span>
          <span className="text-xl font-bold text-white ml-2">
            Secret {operator} {claimValue}
          </span>
        </div>
      </div>

      {/* Wager Input */}
      <div className="mb-6">
        <label className="block text-slate-300 mb-2">Wager Amount</label>
        <input
          type="number"
          min="1"
          value={wager}
          onChange={(e) => setWager(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg"
        />
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={isEncrypting}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isEncrypting ? "Encrypting Secret..." : "Create Challenge"}
      </motion.button>
    </div>
  );
}
