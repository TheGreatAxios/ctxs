import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlightInfo, Passenger } from '../types';

interface LaunchPadProps {
  flightInfo: FlightInfo | null;
  passengers: Passenger[];
  account: string | null;
  pendingWithdrawal: bigint;
  crashPoint: bigint;
  error: string | null;
  onConnect: () => void;
  onBoard: (amount: string, ejectMultiplier: number) => Promise<void>;
  onLaunch: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  onClearError: () => void;
}

export function LaunchPad({
  flightInfo,
  passengers,
  account,
  pendingWithdrawal,
  crashPoint,
  error,
  onConnect,
  onBoard,
  onLaunch,
  onWithdraw,
  onClearError,
}: LaunchPadProps) {
  const [betAmount, setBetAmount] = useState('0.1');
  const [ejectMultiplier, setEjectMultiplier] = useState(2.0);
  const [isBoarding, setIsBoarding] = useState(false);
  const [countdown, setCountdown] = useState(15);

  // Countdown timer
  useEffect(() => {
    if (!flightInfo?.isBettingOpen) {
      setCountdown(0);
      return;
    }
    setCountdown(Number(flightInfo.secondsRemaining));
  }, [flightInfo]);

  const handleBoard = async () => {
    if (!account) {
      onConnect();
      return;
    }

    setIsBoarding(true);
    try {
      await onBoard(betAmount, ejectMultiplier);
      setBetAmount('0.1');
    } catch (err) {
      // Error already set in hook
    } finally {
      setIsBoarding(false);
    }
  };

  const handleLaunch = async () => {
    setIsBoarding(true);
    try {
      await onLaunch();
    } catch (err) {
      // Error already set in hook
    } finally {
      setIsBoarding(false);
    }
  };

  const formatEther = (wei: bigint) => {
    return (Number(wei) / 1e18).toFixed(4);
  };

  const formatMultiplier = (mult: bigint) => {
    return (Number(mult) / 100).toFixed(2);
  };

  const hasBoarded = account && passengers.some(
    (p) => p.player.toLowerCase() === account.toLowerCase()
  );

  const isWaiting = !flightInfo?.hasPassengers;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-3xl p-8 border border-gray-800/50 backdrop-blur-sm relative overflow-hidden"
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
        animate={{
          background: [
            'radial-gradient(circle at 0% 50%, rgba(59, 130, 246, 0.1), transparent 50%)',
            'radial-gradient(circle at 100% 50%, rgba(168, 85, 247, 0.1), transparent 50%)',
            'radial-gradient(circle at 0% 50%, rgba(59, 130, 246, 0.1), transparent 50%)',
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
          >
            <h2 className="text-3xl font-black text-white mb-1 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Flight #{flightInfo?.flightNumber.toString() || '---'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isWaiting ? (
                <span className="text-yellow-400 animate-pulse">⏳ Waiting for first passenger...</span>
              ) : flightInfo?.isBettingOpen ? (
                <span className="text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
                  Boarding Open
                </span>
              ) : (
                <span className="text-orange-400">🚀 In Flight</span>
              )}
            </p>
          </motion.div>
          
          {/* Timer */}
          <motion.div 
            className="text-right"
            animate={flightInfo?.isBettingOpen ? {
              scale: countdown <= 3 ? [1, 1.1, 1] : 1,
            } : {}}
            transition={{ duration: 0.5, repeat: countdown <= 3 ? Infinity : 0 }}
          >
            <div className={`text-5xl font-black font-mono tabular-nums ${
              countdown <= 3 ? 'text-red-500' : 'text-white'
            }`}>
              {isWaiting ? '--' : countdown.toFixed(1)}
            </div>
            <div className="text-gray-400 text-sm">seconds</div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div 
            className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50"
            whileHover={{ scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' }}
          >
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Total Pot</div>
            <motion.div 
              key={flightInfo?.totalPot.toString()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black text-white"
            >
              {flightInfo ? formatEther(flightInfo.totalPot) : '0.0000'} 
              <span className="text-sm font-normal text-gray-500 ml-1">ETH</span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50"
            whileHover={{ scale: 1.02, borderColor: 'rgba(168, 85, 247, 0.5)' }}
          >
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Passengers</div>
            <motion.div 
              key={flightInfo?.passengerCount.toString()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black text-white"
            >
              {flightInfo?.passengerCount.toString() || '0'}
            </motion.div>
          </motion.div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-900/40 border border-red-500/50 rounded-xl p-4 flex items-start gap-3"
            >
              <span className="text-red-400 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-300 text-sm font-bold">Error</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
              </div>
              <button
                onClick={onClearError}
                className="text-red-400 hover:text-red-300 text-lg leading-none"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launch Button (when betting closed but not yet launched) */}
        <AnimatePresence>
          {!flightInfo?.isBettingOpen && flightInfo?.hasPassengers && crashPoint === 0n && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-4"
            >
              <motion.button
                onClick={handleLaunch}
                disabled={isBoarding}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-lg shadow-orange-500/25 transition-all"
              >
                {isBoarding ? 'LAUNCHING...' : '🚀 LAUNCH FLIGHT'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hasBoarded ? (
            <motion.div
              key="onboard"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 text-center backdrop-blur-sm"
            >
              <motion.div 
                className="text-5xl mb-3"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎫
              </motion.div>
              <p className="text-blue-300 font-bold text-lg">You're on board!</p>
              <p className="text-blue-400/70 text-sm mt-1">
                Auto-eject at: <span className="text-white font-mono text-lg">
                  {formatMultiplier(passengers.find(p => p.player.toLowerCase() === account!.toLowerCase())?.ejectMultiplier || 0n)}x
                </span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="betting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              {/* Bet Amount */}
              <div>
                <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">Bet Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    step="0.01"
                    min="0.001"
                    className="w-full bg-gray-800/80 border-2 border-gray-700 rounded-xl px-4 py-4 text-2xl font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition-all"
                    disabled={!flightInfo?.isBettingOpen || isBoarding}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">ETH</span>
                </div>
                
                {/* Quick amounts */}
                <div className="flex gap-2 mt-2">
                  {['0.01', '0.05', '0.1', '0.5', '1'].map((amt) => (
                    <motion.button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      disabled={!flightInfo?.isBettingOpen}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-300 transition-colors"
                    >
                      {amt}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Eject Multiplier */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-400 text-xs uppercase tracking-wider">Auto Eject</label>
                  <motion.span 
                    key={ejectMultiplier}
                    initial={{ scale: 1.2, color: '#60A5FA' }}
                    animate={{ scale: 1, color: '#FFFFFF' }}
                    className="text-2xl font-black font-mono"
                  >
                    {ejectMultiplier.toFixed(2)}x
                  </motion.span>
                </div>
                
                <div className="relative h-12 bg-gray-800/80 rounded-xl overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20"
                    style={{ opacity: 0.5 }}
                  />
                  <input
                    type="range"
                    value={ejectMultiplier}
                    onChange={(e) => setEjectMultiplier(parseFloat(e.target.value))}
                    min="1.01"
                    max="50"
                    step="0.01"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={!flightInfo?.isBettingOpen || isBoarding}
                  />
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                    style={{ width: `${((ejectMultiplier - 1.01) / (50 - 1.01)) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                  <span className="text-green-400">1.01x (Safe)</span>
                  <span className="text-yellow-400">10x</span>
                  <span className="text-red-400">50x (Degen)</span>
                </div>
              </div>

              {/* Board Button */}
              <motion.button
                onClick={handleBoard}
                disabled={(!flightInfo?.isBettingOpen && !isWaiting) || isBoarding}
                whileHover={{ scale: (flightInfo?.isBettingOpen || isWaiting) ? 1.02 : 1 }}
                whileTap={{ scale: (flightInfo?.isBettingOpen || isWaiting) ? 0.98 : 1 }}
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all relative overflow-hidden ${
                  flightInfo?.isBettingOpen || isWaiting
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {/* Animated background */}
                {(flightInfo?.isBettingOpen || isWaiting) && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isBoarding ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                      />
                      BOARDING...
                    </>
                  ) : account ? (
                    <>
                      <motion.span
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        🚀
                      </motion.span>
                      BOARD ROCKET
                    </>
                  ) : (
                    <>
                      🔗 CONNECT WALLET
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Withdrawals */}
        <AnimatePresence>
          {pendingWithdrawal > 0n && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="mt-4 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Winnings</p>
                  <motion.p 
                    key={pendingWithdrawal.toString()}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-green-300 font-black text-2xl"
                  >
                    {formatEther(pendingWithdrawal)} ETH
                  </motion.p>
                </div>
                <motion.button
                  onClick={onWithdraw}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-black text-sm transition-all"
                >
                  CLAIM 🎉
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}