import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Passenger } from '../types';
import { AGENT_AVATARS } from '../types';

interface PassengerManifestProps {
  passengers: Passenger[];
  currentMultiplier: number;
  crashPoint: number | null;
  phase: 'waiting' | 'boarding' | 'launching' | 'flying' | 'crashed' | 'resolved';
}

interface PassengerWithStatus {
  passenger: Passenger;
  avatar: (typeof AGENT_AVATARS)[0];
  status: 'waiting' | 'flying' | 'ejected' | 'burned';
  payout: number;
}

export function PassengerManifest({
  passengers,
  currentMultiplier,
  crashPoint,
  phase,
}: PassengerManifestProps) {
  const [filter, setFilter] = useState<'all' | 'winners' | 'losers'>('all');

  const passengersWithStatus: PassengerWithStatus[] = passengers.map((p, i) => {
    const ejectMult = Number(p.ejectMultiplier) / 100;
    let status: PassengerWithStatus['status'] = 'waiting';
    let payout = 0;

    if (phase === 'flying' || phase === 'crashed') {
      if (crashPoint && ejectMult < crashPoint) {
        status = currentMultiplier >= ejectMult ? 'ejected' : 'flying';
        payout = (Number(p.betAmount) / 1e18) * ejectMult;
      } else if (crashPoint) {
        status = 'burned';
      }
    }

    return {
      passenger: p,
      avatar: AGENT_AVATARS[i % AGENT_AVATARS.length],
      status,
      payout,
    };
  });

  const filteredPassengers = passengersWithStatus.filter((pws) => {
    if (filter === 'winners') return pws.status === 'ejected';
    if (filter === 'losers') return pws.status === 'burned';
    return true;
  });

  const formatEther = (wei: bigint) => {
    return (Number(wei) / 1e18).toFixed(4);
  };

  const formatMultiplier = (mult: bigint) => {
    return (Number(mult) / 100).toFixed(2);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusIcon = (status: PassengerWithStatus['status']) => {
    switch (status) {
      case 'waiting':
        return '⏳';
      case 'flying':
        return '🚀';
      case 'ejected':
        return '🪂';
      case 'burned':
        return '💀';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: PassengerWithStatus['status']) => {
    switch (status) {
      case 'waiting':
        return 'text-gray-400';
      case 'flying':
        return 'text-blue-400';
      case 'ejected':
        return 'text-green-400';
      case 'burned':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const winnerCount = passengersWithStatus.filter(p => p.status === 'ejected').length;
  const loserCount = passengersWithStatus.filter(p => p.status === 'burned').length;
  const totalPayout = passengersWithStatus.reduce((acc, p) => acc + p.payout, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-3xl p-6 border border-gray-800/50 h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            👥 Passenger Manifest
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {passengers.length > 0 ? `${passengers.length} brave souls on board` : 'No passengers yet'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      {passengers.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-800/50 p-1 rounded-xl">
          {(['all', 'winners', 'losers'] as const).map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f
                  ? f === 'winners' 
                    ? 'bg-green-500 text-black'
                    : f === 'losers'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' && `All (${passengers.length})`}
              {f === 'winners' && `Winners (${winnerCount})`}
              {f === 'losers' && `KIA (${loserCount})`}
            </motion.button>
          ))}
        </div>
      )}

      {/* Passenger list */}
      <div className="space-y-2 overflow-y-auto flex-1 max-h-[350px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {filteredPassengers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-4xl mb-3">🌌</div>
              <p className="text-gray-500">
                {filter === 'all' ? 'No passengers yet' : `No ${filter}`}
              </p>
            </motion.div>
          ) : (
            filteredPassengers.map((pws, index) => (
              <motion.div
                key={pws.passenger.player}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  pws.status === 'ejected'
                    ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-500/30'
                    : pws.status === 'burned'
                    ? 'bg-gradient-to-r from-red-900/30 to-orange-900/20 border-red-500/30'
                    : pws.status === 'flying'
                    ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/20 border-blue-500/30'
                    : 'bg-gray-800/40 border-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ 
                      background: `linear-gradient(135deg, ${pws.avatar.color}40, ${pws.avatar.color}20)`,
                      border: `1px solid ${pws.avatar.color}60`,
                    }}
                  >
                    {pws.avatar.emoji}
                  </motion.div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      {pws.avatar.name}
                    </div>
                    <div className="text-gray-500 text-xs font-mono">
                      {shortenAddress(pws.passenger.player)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <motion.div 
                    className="text-white font-mono font-bold text-sm"
                    key={pws.passenger.betAmount.toString()}
                    initial={{ scale: 1.2, color: '#60A5FA' }}
                    animate={{ scale: 1, color: '#FFFFFF' }}
                  >
                    {formatEther(pws.passenger.betAmount)} ETH
                  </motion.div>
                  <div className="text-gray-400 text-xs">
                    @ {formatMultiplier(pws.passenger.ejectMultiplier)}x
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {pws.status === 'ejected' && pws.payout > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-400 font-black text-sm bg-green-500/20 px-3 py-1 rounded-full"
                    >
                      +{pws.payout.toFixed(4)} ETH
                    </motion.div>
                  )}
                  <motion.div 
                    className={`text-2xl ${getStatusColor(pws.status)}`}
                    animate={pws.status === 'flying' ? {
                      y: [0, -3, 0],
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {getStatusIcon(pws.status)}
                  </motion.div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Results summary */}
      {phase === 'crashed' && passengers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-gray-800"
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-green-900/20 rounded-xl p-3 border border-green-500/20"
            >
              <div className="text-green-400 text-2xl font-black">{winnerCount}</div>
              <div className="text-green-500/70 text-xs font-bold uppercase">Survivors</div>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-red-900/20 rounded-xl p-3 border border-red-500/20"
            >
              <div className="text-red-400 text-2xl font-black">{loserCount}</div>
              <div className="text-red-500/70 text-xs font-bold uppercase">KIA</div>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-900/20 rounded-xl p-3 border border-blue-500/20"
            >
              <div className="text-blue-400 text-2xl font-black">{totalPayout.toFixed(3)}</div>
              <div className="text-blue-500/70 text-xs font-bold uppercase">Paid Out</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}