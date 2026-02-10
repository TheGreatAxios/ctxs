import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from './config/contract'
import CreateGame from './components/CreateGame'
import JoinGame from './components/JoinGame'
import GameView from './components/GameView'
import GameList from './components/GameList'

function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [activeGame, setActiveGame] = useState<number | null>(null)

  const contractAddress = chainId ? CONTRACT_ADDRESS[chainId as keyof typeof CONTRACT_ADDRESS] : undefined

  return (
    <div className="container">
      <header>
        <h1>✊ ✋ ✌️ Rock Paper Scissors</h1>
        <p className="subtitle">On-chain game with encrypted moves & optional wagering</p>
      </header>

      <div className="wallet-section">
        {!isConnected ? (
          <button className="connect-btn" onClick={() => connect()}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <button className="action-btn" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isConnected && contractAddress && (
        <div className="main-content">
          {activeGame ? (
            <GameView 
              gameId={activeGame} 
              contractAddress={contractAddress}
              onClose={() => setActiveGame(null)}
            />
          ) : (
            <>
              <CreateGame contractAddress={contractAddress} />
              <JoinGame 
                contractAddress={contractAddress} 
                onGameJoined={setActiveGame}
              />
              <GameList 
                contractAddress={contractAddress}
                onSelectGame={setActiveGame}
              />
            </>
          )}
        </div>
      )}

      {isConnected && !contractAddress && (
        <div className="card">
          <h2>Unsupported Network</h2>
          <p>Please connect to SKALE Testnet (Chain ID: 103698795)</p>
        </div>
      )}
    </div>
  )
}

export default App