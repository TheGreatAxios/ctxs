import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LaunchPad } from './components/LaunchPad';
import { FlightView } from './components/FlightView';
import { PassengerManifest } from './components/PassengerManifest';
import { useContract } from './hooks/useContract';
import type { GameState } from './types';

function App() {
  const {
    account,
    flightInfo,
    passengers,
    pendingWithdrawal,
    connect,
    boardRocket,
    withdraw,
  } = useContract();

  const [gameState, setGameState] = useState<GameState>({
    currentMultiplier: 1.0,
    targetMultiplier: null,
    phase: 'waiting',
    flightNumber: 0n,
    lastCrashPoint: null,
  });

  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [prevFlightNumber, setPrevFlightNumber] = useState<bigint>(0n);
  const flightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle game phase transitions
  useEffect(() => {
    if (!flightInfo) return;

    // Check if flight changed
    if (flightInfo.flightNumber !== prevFlightNumber) {
      setPrevFlightNumber(flightInfo.flightNumber);
      
      // Reset game state for new flight
      setGameState({
        currentMultiplier: 1.0,
        targetMultiplier: null,
        phase: flightInfo.hasPassengers ? 'boarding' : 'waiting',
        flightNumber: flightInfo.flightNumber,
        lastCrashPoint: gameState.lastCrashPoint,
      });
      setCrashPoint(null);
      
      // Clear any existing timer
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
        flightTimerRef.current = null;
      }
    }

    // Handle phase transitions
    const currentPhase = gameState.phase;
    
    // Waiting -> Boarding (when first passenger boards)
    if (currentPhase === 'waiting' && flightInfo.hasPassengers) {
      setGameState(prev => ({ ...prev, phase: 'boarding' }));
    }
    
    // Boarding -> Launching (when timer hits 0)
    if (currentPhase === 'boarding' && !flightInfo.isBettingOpen && flightInfo.hasPassengers) {
      setGameState(prev => ({ ...prev, phase: 'launching' }));
      
      // After 1 second of launching animation, start flying
      flightTimerRef.current = setTimeout(() => {
        // Simulate crash point - in real app, this comes from contract
        const simulatedCrashPoint = 1.01 + Math.random() * 4;
        setCrashPoint(simulatedCrashPoint);
        setGameState(prev => ({ ...prev, phase: 'flying' }));
      }, 1000);
    }

  }, [flightInfo, prevFlightNumber, gameState.phase, gameState.lastCrashPoint]);

  // Animate multiplier during flight
  useEffect(() => {
    if (gameState.phase !== 'flying' || !crashPoint) return;

    let current = 1.0;
    const duration = 4000; // 4 seconds to reach crash
    const steps = 60;
    const increment = (crashPoint - 1) / steps;
    const interval = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      setGameState(prev => ({ ...prev, currentMultiplier: current }));

      if (current >= crashPoint) {
        clearInterval(timer);
        setGameState(prev => ({
          ...prev,
          phase: 'crashed',
          targetMultiplier: crashPoint,
          lastCrashPoint: crashPoint,
        }));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [gameState.phase, crashPoint]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 40%)',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-4xl"
            >
              🚀
            </motion.div>
            <div>
              <h1 className="text-3xl font-black">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ROCKET CRASH
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-bold tracking-wider">SKALE EDITION • PROVABLY FAIR</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {account ? (
              <motion.div 
                className="bg-gray-900/80 border border-gray-700/50 rounded-2xl px-5 py-3 backdrop-blur-sm"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Connected</div>
                <div className="text-sm font-mono font-bold text-white">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </motion.div>
            ) : (
              <motion.button
                onClick={connect}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black text-sm tracking-wider transition-all"
              >
                CONNECT WALLET
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - LaunchPad */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <LaunchPad
              flightInfo={flightInfo}
              passengers={passengers}
              account={account}
              pendingWithdrawal={pendingWithdrawal}
              onConnect={connect}
              onBoard={boardRocket}
              onWithdraw={withdraw}
            />
          </motion.div>

          {/* Center Column - Flight View */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <FlightView
              phase={gameState.phase}
              currentMultiplier={gameState.currentMultiplier}
              targetMultiplier={gameState.targetMultiplier}
              passengers={passengers}
              crashPoint={crashPoint}
            />
          </motion.div>

          {/* Right Column - Passenger Manifest */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PassengerManifest
              passengers={passengers}
              currentMultiplier={gameState.currentMultiplier}
              crashPoint={crashPoint}
              phase={gameState.phase}
            />
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div 
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {[
            {
              icon: '🎲',
              title: 'SKALE Native RNG',
              desc: 'Free consensus-based randomness. No Chainlink needed. Provably fair and instant.',
              color: 'from-blue-500/20 to-cyan-500/20',
              border: 'border-blue-500/30',
            },
            {
              icon: '🔐',
              title: 'BITE Encryption',
              desc: 'Crash point encrypted with threshold encryption. No front-running, no manipulation.',
              color: 'from-purple-500/20 to-pink-500/20',
              border: 'border-purple-500/30',
            },
            {
              icon: '⚡',
              title: '2-Second Finality',
              desc: 'Lightning-fast blocks with SKALE. Quick games, instant settlements, no waiting.',
              color: 'from-yellow-500/20 to-orange-500/20',
              border: 'border-yellow-500/30',
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              whileHover={{ 
                scale: 1.02, 
                y: -5,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 border ${card.border} backdrop-blur-sm transition-all`}
            >
              <motion.div 
                className="text-4xl mb-4"
                whileHover={{ scale: 1.2, rotate: 10 }}
              >
                {card.icon}
              </motion.div>
              <h3 className="text-lg font-black text-white mb-2">{card.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-600 text-sm">
            Built with 🔥 on <span className="text-gray-400">SKALE</span> • Using <span className="text-gray-400">BITE Protocol v2</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;