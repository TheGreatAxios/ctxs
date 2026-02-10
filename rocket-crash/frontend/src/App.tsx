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
    crashPoint,
    error,
    connect,
    boardRocket,
    launchFlight,
    withdraw,
  } = useContract();

  const [gameState, setGameState] = useState<GameState>({
    currentMultiplier: 1.0,
    targetMultiplier: null,
    phase: 'waiting',
    flightNumber: 0n,
    lastCrashPoint: null,
  });

  const [prevFlightNumber, setPrevFlightNumber] = useState<bigint>(0n);
  const flightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDev = import.meta.env.DEV;

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
      // Clear any existing timer
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
        flightTimerRef.current = null;
      }
    }

    // Check if crash point is revealed (no longer 0)
    const contractCrashPoint = Number(crashPoint);
    if (contractCrashPoint > 0 && gameState.phase !== 'crashed' && gameState.phase !== 'resolved') {
      // Convert from hundredths to decimal (e.g., 101 -> 1.01)
      const actualCrashPoint = contractCrashPoint / 100;
      setGameState(prev => ({
        ...prev,
        phase: 'crashed',
        targetMultiplier: actualCrashPoint,
        lastCrashPoint: actualCrashPoint,
        currentMultiplier: actualCrashPoint,
      }));
    }

    // Handle phase transitions
    const currentPhase = gameState.phase;

    // Waiting -> Boarding (when first passenger boards)
    if (currentPhase === 'waiting' && flightInfo.hasPassengers) {
      setGameState(prev => ({ ...prev, phase: 'boarding' }));
    }

    // Boarding -> Launching (when timer hits 0)
    if (currentPhase === 'boarding' && !flightInfo.isBettingOpen && flightInfo.hasPassengers && crashPoint === 0n) {
      setGameState(prev => ({ ...prev, phase: 'launching' }));
    }

  }, [flightInfo, prevFlightNumber, gameState.phase, gameState.lastCrashPoint, crashPoint]);

  // Animate multiplier during flight (when we know the crash point)
  useEffect(() => {
    // Only animate if we're launching and crash point is not yet known
    if (gameState.phase !== 'launching' || crashPoint > 0) return;

    let current = 1.0;
    const targetCrash = 2.5; // Default animation target before actual crash is revealed
    const duration = 3000; // 3 seconds
    const steps = 60;
    const increment = (targetCrash - 1) / steps;
    const interval = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      setGameState(prev => ({ ...prev, currentMultiplier: current }));

      if (current >= targetCrash) {
        clearInterval(timer);
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
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  // Simulation function for dev mode
  const runSimulation = useCallback(() => {
    // Clear any existing simulation
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }

    const crashAt = 2 + Math.random() * 6; // Random crash between 2x and 8x
    let current = 1.0;
    const duration = 10000; // 10 seconds total
    const steps = 100;
    const interval = duration / steps;
    const increment = 9 / steps; // Go from 1x to 10x

    // Start launching phase
    setGameState({
      currentMultiplier: 1.0,
      targetMultiplier: null,
      phase: 'launching',
      flightNumber: 999999n,
      lastCrashPoint: null,
    });

    // After 500ms, switch to flying
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'flying' }));

      // Animate multiplier
      simTimerRef.current = setInterval(() => {
        current += increment;

        if (current >= crashAt) {
          // Crash!
          if (simTimerRef.current) {
            clearInterval(simTimerRef.current);
          }
          setGameState({
            currentMultiplier: crashAt,
            targetMultiplier: crashAt,
            phase: 'crashed',
            flightNumber: 999999n,
            lastCrashPoint: crashAt,
          });

          // Reset after 3 seconds
          setTimeout(() => {
            setGameState({
              currentMultiplier: 1.0,
              targetMultiplier: null,
              phase: 'waiting',
              flightNumber: 0n,
              lastCrashPoint: crashAt,
            });
          }, 3000);
        } else {
          setGameState(prev => ({
            ...prev,
            currentMultiplier: current,
          }));
        }
      }, interval);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
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
            backgroundColor: 'rgba(168, 85, 247, 0.05)',
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
              <h1 className="text-3xl font-black text-white">
                CRASH
              </h1>
              <p className="text-xs text-gray-500 font-bold tracking-wider">SKALE EDITION • PROVABLY FAIR</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isDev && (
              <motion.button
                onClick={runSimulation}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                className="bg-green-600 text-white px-6 py-4 rounded-2xl font-black text-sm tracking-wider transition-all"
                title="Simulate rocket flight (0-10s)"
              >
                🧪 SIM
              </motion.button>
            )}
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
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm tracking-wider transition-all"
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
              crashPoint={crashPoint}
              error={error}
              onConnect={connect}
              onBoard={boardRocket}
              onLaunch={launchFlight}
              onWithdraw={withdraw}
              onClearError={() => {}}
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
              bgColor: 'bg-blue-900/20',
              border: 'border-blue-500/30',
            },
            {
              icon: '🔐',
              title: 'BITE Encryption',
              desc: 'Crash point encrypted with threshold encryption. No front-running, no manipulation.',
              bgColor: 'bg-purple-900/20',
              border: 'border-purple-500/30',
            },
            {
              icon: '⚡',
              title: '2-Second Finality',
              desc: 'Lightning-fast blocks with SKALE. Quick games, instant settlements, no waiting.',
              bgColor: 'bg-yellow-900/20',
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
              className={`${card.bgColor} rounded-2xl p-6 border ${card.border} backdrop-blur-sm transition-all`}
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