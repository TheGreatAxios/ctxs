import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Passenger, AgentAvatar } from '../types';
import { AGENT_AVATARS } from '../types';

interface FlightViewProps {
  phase: 'waiting' | 'boarding' | 'launching' | 'flying' | 'crashed' | 'resolved';
  currentMultiplier: number;
  targetMultiplier: number | null;
  passengers: Passenger[];
  crashPoint: number | null;
}

interface AnimatedPassenger {
  passenger: Passenger;
  avatar: AgentAvatar;
  ejectedAt: number | null;
  status: 'waiting' | 'flying' | 'ejected' | 'burned';
}

export function FlightView({
  phase,
  currentMultiplier,
  targetMultiplier,
  passengers,
  crashPoint,
}: FlightViewProps) {
  const [animatedPassengers, setAnimatedPassengers] = useState<AnimatedPassenger[]>([]);
  const [showExplosion, setShowExplosion] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    const withAvatars = passengers.map((p, i) => ({
      passenger: p,
      avatar: AGENT_AVATARS[i % AGENT_AVATARS.length],
      ejectedAt: null as number | null,
      status: phase === 'waiting' ? 'waiting' : 'flying' as const,
    }));
    setAnimatedPassengers(withAvatars);
  }, [passengers, phase]);

  useEffect(() => {
    if (phase === 'flying' && crashPoint) {
      setAnimatedPassengers((prev) =>
        prev.map((ap) => {
          const ejectMultiplier = Number(ap.passenger.ejectMultiplier) / 100;
          if (ap.status === 'flying' && currentMultiplier >= ejectMultiplier && ejectMultiplier < crashPoint) {
            return { ...ap, status: 'ejected', ejectedAt: ejectMultiplier };
          }
          return ap;
        })
      );
    }

    if (phase === 'crashed' && crashPoint) {
      setShowExplosion(true);
      
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        color: ['#F59E0B', '#DC2626', '#EF4444', '#FBBF24'][Math.floor(Math.random() * 4)],
      }));
      setParticles(newParticles);
      
      setAnimatedPassengers((prev) =>
        prev.map((ap) => {
          if (ap.status === 'flying' || ap.status === 'waiting') {
            const ejectMultiplier = Number(ap.passenger.ejectMultiplier) / 100;
            if (ejectMultiplier >= crashPoint) {
              return { ...ap, status: 'burned' };
            }
          }
          return ap;
        })
      );

      setTimeout(() => setParticles([]), 3000);
    }
  }, [phase, currentMultiplier, crashPoint]);

  useEffect(() => {
    if (phase === 'waiting' || phase === 'boarding') {
      setShowExplosion(false);
      setParticles([]);
    }
  }, [phase]);

  const getRocketY = () => {
    if (phase === 'waiting' || phase === 'boarding') return 0;
    if (phase === 'launching') return -30;
    if (phase === 'flying' || phase === 'crashed') {
      const progress = Math.min((currentMultiplier - 1) / 9, 1);
      return -30 - progress * 280;
    }
    return 0;
  };

  const flyingPassengers = useMemo(() => 
    animatedPassengers.filter((ap) => ap.status === 'flying' || ap.status === 'waiting'),
    [animatedPassengers]
  );

  const ejectedPassengers = useMemo(() =>
    animatedPassengers.filter((ap) => ap.status === 'ejected'),
    [animatedPassengers]
  );

  return (
    <div className="relative h-[550px] bg-black rounded-3xl overflow-hidden border border-gray-800/50">
      {/* Animated starfield */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {(phase === 'flying' || phase === 'launching') && (
          <motion.div
            className="absolute inset-0"
            animate={{ y: [0, 50] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
          >
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={`move-${i}`}
                className="absolute w-0.5 h-8 bg-blue-400/50 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Multiplier Display */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          className={`text-7xl font-black font-mono tabular-nums tracking-tighter ${
            phase === 'crashed' ? 'text-red-500' : phase === 'flying' ? 'text-white' : 'text-gray-400'
          }`}
          animate={{
            scale: phase === 'crashed' ? [1, 1.5, 1] : phase === 'flying' ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: 0.1 }}
        >
          {currentMultiplier.toFixed(2)}x
        </motion.div>
        
        {phase === 'flying' && (
          <motion.div
            className="absolute inset-0 blur-3xl bg-blue-500/30 -z-10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Phase indicator */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="text-sm font-bold uppercase tracking-widest"
            style={{
              color: phase === 'waiting' ? '#FBBF24' : 
                     phase === 'boarding' ? '#34D399' :
                     phase === 'launching' ? '#60A5FA' :
                     phase === 'flying' ? '#A78BFA' :
                     phase === 'crashed' ? '#EF4444' : '#9CA3AF'
            }}
          >
            {phase === 'waiting' && 'WAITING...'}
            {phase === 'boarding' && 'BOARDING OPEN'}
            {phase === 'launching' && 'IGNITION!'}
            {phase === 'flying' && 'CLIMBING!'}
            {phase === 'crashed' && 'CRASHED!'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rocket Container */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          animate={{
            y: getRocketY(),
            scale: phase === 'crashed' ? [1, 0.8, 0] : 1,
            rotate: phase === 'crashed' ? [0, -15, 15, -10, 10, 0] : [-2, 2, -2],
          }}
          transition={{
            y: { type: 'spring', stiffness: 100, damping: 15 },
            scale: { duration: 0.5 },
            rotate: { duration: phase === 'crashed' ? 0.5 : 0.3, repeat: phase === 'crashed' ? 0 : Infinity },
          }}
          className="relative"
        >
          {/* Rocket */}
          <div className="relative">
            {/* Rocket Flame - positioned BEHIND rocket */}
            <AnimatePresence>
              {(phase === 'launching' || phase === 'flying') && (
                <motion.div
                  className="absolute"
                  style={{ 
                    top: '108px',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 1
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: [1, 1.2, 1],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    scale: { duration: 0.1, repeat: Infinity },
                  }}
                >
                  <svg width="50" height="80" viewBox="0 0 50 80">
                    {/* Outer flame - orange/yellow */}
                    <motion.path
                      d="M25 0 L20 20 L15 40 L10 60 L20 50 L25 70 L30 50 L40 60 L35 40 L30 20 Z"
                      fill="#F59E0B"
                      stroke="#DC2626"
                      strokeWidth="1"
                      animate={{ 
                        d: [
                          'M25 0 L20 20 L15 40 L10 60 L20 50 L25 70 L30 50 L40 60 L35 40 L30 20 Z',
                          'M25 0 L18 22 L12 42 L8 65 L18 52 L25 75 L32 52 L42 65 L38 42 L32 22 Z',
                          'M25 0 L22 18 L18 38 L12 58 L22 48 L25 68 L28 48 L38 58 L32 38 L28 18 Z',
                          'M25 0 L20 20 L15 40 L10 60 L20 50 L25 70 L30 50 L40 60 L35 40 L30 20 Z',
                        ]
                      }}
                      transition={{ duration: 0.15, repeat: Infinity }}
                    />
                    
                    {/* Inner flame - blue */}
                    <motion.path
                      d="M25 5 L22 20 L18 35 L15 50 L22 42 L25 55 L28 42 L35 50 L32 35 L28 20 Z"
                      fill="#3B82F6"
                      stroke="#1E40AF"
                      strokeWidth="1"
                      animate={{ 
                        d: [
                          'M25 5 L22 20 L18 35 L15 50 L22 42 L25 55 L28 42 L35 50 L32 35 L28 20 Z',
                          'M25 5 L20 22 L16 38 L12 52 L20 45 L25 58 L30 45 L38 52 L34 38 L30 22 Z',
                          'M25 5 L24 18 L20 32 L18 48 L24 40 L25 52 L26 40 L32 48 L30 32 L26 18 Z',
                          'M25 5 L22 20 L18 35 L15 50 L22 42 L25 55 L28 42 L35 50 L32 35 L28 20 Z',
                        ]
                      }}
                      transition={{ duration: 0.12, repeat: Infinity }}
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            <svg width="100" height="140" viewBox="0 0 100 140" className="mx-auto relative" style={{ zIndex: 2, position: 'relative' }}>
              {/* Fins - red */}
              <motion.path 
                d="M20 80 L0 120 L20 105 Z" 
                fill="#DC2626"
                stroke="#8B0000"
                strokeWidth="1"
                animate={phase === 'flying' ? { d: ['M20 80 L0 120 L20 105 Z', 'M20 80 L-5 125 L20 105 Z', 'M20 80 L0 120 L20 105 Z'] } : {}}
                transition={{ duration: 0.2, repeat: Infinity }}
              />
              <motion.path 
                d="M80 80 L100 120 L80 105 Z" 
                fill="#DC2626"
                stroke="#8B0000"
                strokeWidth="1"
                animate={phase === 'flying' ? { d: ['M80 80 L100 120 L80 105 Z', 'M80 80 L105 125 L80 105 Z', 'M80 80 L100 120 L80 105 Z'] } : {}}
                transition={{ duration: 0.2, repeat: Infinity }}
              />
              
              {/* Body - solid blue */}
              <path d="M50 0 L80 50 L80 100 L50 115 L20 100 L20 50 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" />
              
              {/* Window - solid dark blue */}
              <ellipse cx="50" cy="40" rx="18" ry="25" fill="#1E3A5F" stroke="#60A5FA" strokeWidth="2" />
              <ellipse cx="45" cy="35" rx="8" ry="12" fill="#60A5FA" opacity="0.6" />
              
              {/* Detail lines */}
              <path d="M20 70 Q50 80 80 70" fill="none" stroke="#1E40AF" strokeWidth="2" opacity="0.5" />
            </svg>
          </div>

          {/* Passengers in rocket windows */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-0.5 w-20">
            <AnimatePresence>
              {flyingPassengers.map((ap, i) => (
                <motion.div
                  key={ap.avatar.id}
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0, y: -30, rotate: 180 }}
                  transition={{ 
                    delay: i * 0.1,
                    type: 'spring',
                    stiffness: 200,
                  }}
                  className="text-lg"
                  style={{ 
                    position: 'absolute', 
                    left: `${(i % 3) * 22 + 10}px`, 
                    top: `${Math.floor(i / 3) * 22 + 8}px`,
                  }}
                >
                  {ap.avatar.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Ejected passengers with parachutes */}
      <AnimatePresence>
        {ejectedPassengers.map((ap, idx) => (
          <motion.div
            key={ap.avatar.id}
            initial={{ opacity: 0, y: 0, x: 0 }}
            animate={{
              opacity: 1,
              y: 200,
              x: (idx % 2 === 0 ? 1 : -1) * (50 + Math.random() * 100),
              rotate: [0, (idx % 2 === 0 ? 1 : -1) * 10, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 3,
              ease: 'easeOut',
            }}
            className="absolute z-10"
            style={{
              left: `50%`,
              top: `${350 - (ap.ejectedAt || 0) * 20}px`,
            }}
          >
            <div className="flex flex-col items-center">
              <motion.svg 
                width="40" height="30" viewBox="0 0 40 30"
                animate={{ 
                  scaleY: [1, 1.1, 1],
                  rotate: [(idx % 2 === 0 ? 1 : -1) * 5, (idx % 2 === 0 ? -1 : 1) * 5, (idx % 2 === 0 ? 1 : -1) * 5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <path
                  d="M20 5 Q5 20 0 25 L5 25 Q10 15 20 10 Q30 15 35 25 L40 25 Q35 20 20 5"
                  fill="#22C55E"
                  stroke="#15803D"
                  strokeWidth="1"
                />
                <line x1="20" y1="10" x2="20" y2="25" stroke="#15803D" strokeWidth="1" />
                <line x1="10" y1="20" x2="20" y2="25" stroke="#15803D" strokeWidth="1" />
                <line x1="30" y1="20" x2="20" y2="25" stroke="#15803D" strokeWidth="1" />
              </motion.svg>
              
              <div className="text-3xl">{ap.avatar.emoji}</div>
              
              <motion.div 
                className="text-xs text-green-400 font-black bg-black/80 px-2 py-1 rounded-full border border-green-500/50 mt-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {(ap.ejectedAt || 0).toFixed(2)}x
              </motion.div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Explosion Effect */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
          >
            <svg width="400" height="400" viewBox="0 0 400 400">
              <motion.circle
                cx="200"
                cy="200"
                fill="#F59E0B"
                initial={{ r: 10, opacity: 1 }}
                animate={{ r: [10, 150, 200], opacity: [1, 1, 0] }}
                transition={{ duration: 0.6 }}
              />
              <motion.circle
                cx="200"
                cy="200"
                fill="#DC2626"
                initial={{ r: 5, opacity: 1 }}
                animate={{ r: [5, 100, 150], opacity: [1, 1, 0] }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
              <motion.circle
                cx="200"
                cy="200"
                fill="#FFFFFF"
                initial={{ r: 0, opacity: 1 }}
                animate={{ r: [0, 50, 80], opacity: [1, 0.8, 0] }}
                transition={{ duration: 0.4, delay: 0.05 }}
              />
              
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                return (
                  <motion.line
                    key={i}
                    x1="200"
                    y1="200"
                    x2={200 + Math.cos(angle) * 40}
                    y2={200 + Math.sin(angle) * 40}
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ opacity: 1 }}
                    animate={{
                      x2: 200 + Math.cos(angle) * 180,
                      y2: 200 + Math.sin(angle) * 180,
                      opacity: [1, 0.8, 0],
                    }}
                    transition={{ duration: 0.5, delay: i * 0.02 }}
                  />
                );
              })}
            </svg>
            
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-4 h-4 rounded-full"
                style={{ backgroundColor: p.color, left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, scale: 1 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [1, 0.5, 0],
                  opacity: [1, 0.5, 0],
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crash text overlay */}
      <AnimatePresence>
        {phase === 'crashed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-40"
          >
            <motion.div 
              className="text-5xl font-black text-red-500"
              style={{ textShadow: '0 0 30px rgba(239, 68, 68, 0.8)' }}
            >
              {['KABOOM!', 'BLAM!', 'POW!', 'CRASH!', 'BOOM!', 'SPLAT!'][Math.floor(Math.random() * 6)]}
            </motion.div>
            <motion.div 
              className="text-red-400 text-xl mt-2 font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              at {targetMultiplier?.toFixed(2)}x
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for players state */}
      {phase === 'waiting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            🛸
          </motion.div>
          <p className="text-gray-400 text-lg">Waiting for brave pilots...</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to board!</p>
        </motion.div>
      )}
    </div>
  );
}
