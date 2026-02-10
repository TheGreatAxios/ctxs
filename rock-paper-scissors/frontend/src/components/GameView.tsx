import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ABI } from '../config/contract'

interface GameViewProps {
  gameId: number
  contractAddress: string
  onClose: () => void
}

interface GameData {
  player1: string
  player2: string
  commitment1: string
  commitment2: string
  move1: number
  move2: number
  wagerAmount: bigint
  wagerToken: string
  commitDeadline: bigint
  revealDeadline: bigint
  state: number
  winner: string
  player1Revealed: boolean
  player2Revealed: boolean
}

type Move = 0 | 1 | 2 | 3

const moveEmojis: Record<number, string> = {
  0: '❓',
  1: '✊',
  2: '✋',
  3: '✌️',
}

const moveNames: Record<number, string> = {
  0: 'Hidden',
  1: 'Rock',
  2: 'Paper',
  3: 'Scissors',
}

const stateLabels: Record<number, string> = {
  0: 'Waiting for Player 2',
  1: 'Both Committed - Reveal Phase',
  2: 'Revealing Moves',
  3: 'Game Finished',
  4: 'Expired',
}

export default function GameView({ gameId, contractAddress, onClose }: GameViewProps) {
  const { address } = useAccount()
  const [nonce, setNonce] = useState('')

  const { data: game, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
  })

  const { writeContract: revealMove, isPending: isRevealingMove } = useWriteContract()
  const { writeContract: claimTimeout, isPending: isClaiming } = useWriteContract()

  const gameData = game as GameData | undefined
  const isPlayer1 = address?.toLowerCase() === gameData?.player1.toLowerCase()
  const isPlayer2 = address?.toLowerCase() === gameData?.player2.toLowerCase()
  const isPlayer = isPlayer1 || isPlayer2
  const hasRevealed = isPlayer1 ? gameData?.player1Revealed : gameData?.player2Revealed

  const handleReveal = () => {
    if (!nonce || !isPlayer) return
    
    revealMove({
      address: contractAddress as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'revealMove',
      args: [BigInt(gameId), isPlayer1 ? gameData?.move1 || 1 : gameData?.move2 || 1, BigInt(nonce)],
    })
  }

  const handleClaimTimeout = () => {
    claimTimeout({
      address: contractAddress as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'claimTimeout',
      args: [BigInt(gameId)],
    })
  }

  const getWinnerText = () => {
    if (!gameData) return ''
    if (gameData.winner === '0x0000000000000000000000000000000000000000') {
      return "It's a Draw!"
    }
    if (gameData.winner.toLowerCase() === address?.toLowerCase()) {
      return 'You Won!'
    }
    return 'You Lost!'
  }

  if (!gameData) {
    return (
      <div className="card">
        <h2>Game #{gameId}</h2>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Game #{gameId}</h2>
        <button className="action-btn" onClick={onClose}>Back to List</button>
      </div>

      <div className="game-status-large">
        <strong>Status:</strong> {stateLabels[gameData.state] || 'Unknown'}
      </div>

      <div className="players-info">
        <div className="player-box">
          <h3>Player 1</h3>
          <div style={{ fontSize: '4rem', margin: '1rem 0' }}>
            {moveEmojis[gameData.move1]}
          </div>
          <div>{moveNames[gameData.move1]}</div>
          <div className="player-address">{gameData.player1.slice(0, 8)}...</div>
          {gameData.player1Revealed && <span style={{ color: '#4CAF50' }}>Revealed</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: '2rem' }}>VS</div>

        <div className="player-box">
          <h3>Player 2</h3>
          <div style={{ fontSize: '4rem', margin: '1rem 0' }}>
            {gameData.player2 === '0x0000000000000000000000000000000000000000' 
              ? '👤' 
              : moveEmojis[gameData.move2]}
          </div>
          <div>
            {gameData.player2 === '0x0000000000000000000000000000000000000000' 
              ? 'Waiting...' 
              : moveNames[gameData.move2]}
          </div>
          {gameData.player2 !== '0x0000000000000000000000000000000000000000' && (
            <>
              <div className="player-address">{gameData.player2.slice(0, 8)}...</div>
              {gameData.player2Revealed && <span style={{ color: '#4CAF50' }}>Revealed</span>}
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '1.5rem 0', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
        <strong>Wager:</strong> {formatEther(gameData.wagerAmount)} sFUEL
      </div>

      {gameData.state === 3 && (
        <div className={`winner-announcement ${
          gameData.winner.toLowerCase() === address?.toLowerCase() ? 'win' : 
          gameData.winner === '0x0000000000000000000000000000000000000000' ? 'draw' : 'lose'
        }`}>
          {getWinnerText()}
        </div>
      )}

      {isPlayer && gameData.state === 1 && !hasRevealed && (
        <div className="reveal-section">
          <h3>Reveal Your Move</h3>
          <p>Enter your secret nonce to reveal your move:</p>
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter your secret nonce"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
            />
          </div>
          <button
            className="action-btn"
            onClick={handleReveal}
            disabled={!nonce || isRevealingMove}
          >
            {isRevealingMove ? 'Revealing...' : 'Reveal Move'}
          </button>
        </div>
      )}

      {gameData.state !== 3 && gameData.state !== 4 && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            className="action-btn"
            onClick={handleClaimTimeout}
            disabled={isClaiming}
            style={{ background: 'rgba(244, 67, 54, 0.3)' }}
          >
            {isClaiming ? 'Processing...' : 'Claim Timeout'}
          </button>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>
            Use this if the other player doesn't act within the time limit
          </p>
        </div>
      )}
    </div>
  )
}