import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CONTRACT_ADDRESS } from './config/contract'
import { Gamepad2, Sword, Shield } from 'lucide-react'
import CreateGame from './components/CreateGame'
import JoinGame from './components/JoinGame'
import GameView from './components/GameView'
import GameList from './components/GameList'

function App() {
  const { address, chainId } = useAccount()
  const [activeGame, setActiveGame] = useState<number | null>(null)

  const contractAddress = chainId ? CONTRACT_ADDRESS[chainId as keyof typeof CONTRACT_ADDRESS] : undefined

  return (
    <>
      {/* CRT Scanline effect */}
      <div className="scanlines" />

      <div className="min-h-screen font-sans antialiased relative">
        {/* Animated background elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container">
          {/* Cyberpunk Header */}
          <header className="text-center mb-12 relative">
            <div className="inline-flex items-center justify-center gap-4 mb-4">
              <div className="flex gap-2">
                {[Gamepad2, Sword, Shield].map((Icon, i) => (
                  <div key={i} className="stagger-in" style={{ animationDelay: `${i * 0.15}s` }}>
                    <Icon className="w-8 h-8 text-neon-cyan" style={{ filter: 'drop-shadow(0 0 10px hsla(180, 100%, 50%, 0.8))' }} />
                  </div>
                ))}
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-wider mb-2 relative inline-block">
              <span className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
                ROCK PAPER SCISSORS
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70" />
            </h1>
            <p className="text-neon-cyan/80 text-lg tracking-widest uppercase font-semibold">
              On-Chain Encrypted Gaming
            </p>
          </header>

          {/* Wallet Connection */}
          <div className="flex justify-center mb-10">
            <div className="stagger-in" style={{ animationDelay: '0.4s' }}>
              <ConnectButton />
            </div>
          </div>

          {/* Main Content */}
          {address && contractAddress && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeGame ? (
                <div className="md:col-span-2 lg:col-span-3 stagger-in">
                  <GameView
                    gameId={activeGame}
                    contractAddress={contractAddress}
                    onClose={() => setActiveGame(null)}
                  />
                </div>
              ) : (
                <>
                  <div className="stagger-in" style={{ animationDelay: '0.1s' }}>
                    <CreateGame contractAddress={contractAddress} />
                  </div>
                  <div className="stagger-in" style={{ animationDelay: '0.2s' }}>
                    <JoinGame
                      contractAddress={contractAddress}
                      onGameJoined={setActiveGame}
                    />
                  </div>
                  <div className="stagger-in" style={{ animationDelay: '0.3s' }}>
                    <GameList
                      contractAddress={contractAddress}
                      onSelectGame={setActiveGame}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {address && !contractAddress && (
            <div className="flex justify-center stagger-in">
              <div className="card text-center max-w-md">
                <div className="text-5xl mb-4">⚠️</div>
                <h2 className="text-neon-pink text-xl mb-2">UNSUPPORTED NETWORK</h2>
                <p className="text-muted-foreground">Connect to SKALE BITE V2 Sandbox (Chain ID: 2090472038)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App
