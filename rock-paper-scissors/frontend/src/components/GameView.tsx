import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther } from 'viem'
import { ArrowLeft, Gauge, File, Scissors, Lock } from 'lucide-react'
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

const moveIcons: Record<number, any> = {
  0: Lock,
  1: Gauge,
  2: File,
  3: Scissors,
}

const moveNames: Record<number, string> = {
  0: 'HIDDEN',
  1: 'ROCK',
  2: 'PAPER',
  3: 'SCISSORS',
}

const stateLabels: Record<number, string> = {
  0: 'AWAITING PLAYER 2',
  1: 'REVEAL PHASE',
  2: 'REVEALING',
  3: 'GAME OVER',
  4: 'EXPIRED',
}

export default function GameView({ gameId, contractAddress, onClose }: GameViewProps) {
  const { address } = useAccount()
  const [nonce, setNonce] = useState('')

  const { data: game } = useReadContract({
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
      return "DRAW"
    }
    if (gameData.winner.toLowerCase() === address?.toLowerCase()) {
      return 'VICTORY'
    }
    return 'DEFEAT'
  }

  const renderMoveIcon = (move: number) => {
    const Icon = moveIcons[move] || Lock
    return <Icon size={64} strokeWidth={2} />
  }

  if (!gameData) {
    return (
      <div className="card">
        <h2 style={{ fontFamily: 'Orbitron', letterSpacing: '0.15em' }}>// GAME_#{gameId}</h2>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const hasWager = gameData.wagerAmount > 0n
  const isNativeWager = gameData.wagerToken === '0x0000000000000000000000000000000000000000'

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <h2 style={{ fontFamily: 'Orbitron', letterSpacing: '0.15em', margin: 0 }}>
          <span className="text-neon-cyan">#</span>{gameId}
        </h2>
        <button
          className="action-btn"
          onClick={onClose}
          style={{ width: 'auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} />
          BACK
        </button>
      </div>

      {/* Status */}
      <div className="game-status-large">
        <span className="text-neon-cyan">STATUS:</span> {stateLabels[gameData.state] || 'UNKNOWN'}
      </div>

      {/* Players */}
      <div className="players-info">
        <div className="player-box">
          <h3>PLAYER_1</h3>
          <div className="player-move-display text-neon-cyan" style={{ filter: 'drop-shadow(0 0 20px hsla(180, 100%, 50%, 0.6))' }}>
            {renderMoveIcon(gameData.move1)}
          </div>
          <div style={{ fontFamily: 'Orbitron', letterSpacing: '0.1em', fontSize: '0.85rem' }}>
            {moveNames[gameData.move1]}
          </div>
          <div className="player-address">{gameData.player1.slice(0, 8)}...</div>
          {gameData.player1Revealed && (
            <span style={{ color: 'hsl(var(--color-neon-green))', fontSize: '0.7rem', fontWeight: '700' }}>
              ✓ REVEALED
            </span>
          )}
        </div>

        <div className="player-box">
          <h3>PLAYER_2</h3>
          <div className={`player-move-display ${gameData.player2 !== '0x0000000000000000000000000000000000000000' ? 'text-neon-purple' : ''}`}
               style={{ filter: gameData.player2 !== '0x0000000000000000000000000000000000000000' ? 'drop-shadow(0 0 20px hsla(280, 70%, 55%, 0.6))' : '' }}>
            {gameData.player2 === '0x0000000000000000000000000000000000000000'
              ? <Lock size={64} strokeWidth={2} />
              : renderMoveIcon(gameData.move2)}
          </div>
          <div style={{ fontFamily: 'Orbitron', letterSpacing: '0.1em', fontSize: '0.85rem' }}>
            {gameData.player2 === '0x0000000000000000000000000000000000000000'
              ? 'WAITING...'
              : moveNames[gameData.move2]}
          </div>
          {gameData.player2 !== '0x0000000000000000000000000000000000000000' && (
            <>
              <div className="player-address">{gameData.player2.slice(0, 8)}...</div>
              {gameData.player2Revealed && (
                <span style={{ color: 'hsl(var(--color-neon-green))', fontSize: '0.7rem', fontWeight: '700' }}>
                  ✓ REVEALED
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Wager - ERC-20 only */}
      {hasWager && (
        <div style={{
          textAlign: 'center',
          margin: '1.5rem 0',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, hsla(180, 100%, 50%, 0.1), hsla(280, 70%, 55%, 0.1))',
          borderRadius: '10px',
          border: '1px solid hsla(180, 100%, 50%, 0.3)',
          fontWeight: '700',
          fontFamily: 'Orbitron',
          letterSpacing: '0.1em'
        }}>
          <span className="text-neon-cyan">WAGER:</span> {formatEther(gameData.wagerAmount)}{' '}
          <span className="text-neon-purple">{isNativeWager ? 'sFUEL' : 'ERC-20'}</span>
        </div>
      )}

      {/* Winner Announcement */}
      {gameData.state === 3 && (
        <div className={`winner-announcement ${
          gameData.winner.toLowerCase() === address?.toLowerCase() ? 'win' :
          gameData.winner === '0x0000000000000000000000000000000000000000' ? 'draw' : 'lose'
        }`}>
          <span>{getWinnerText()}</span>
        </div>
      )}

      {/* Reveal Section */}
      {isPlayer && gameData.state === 1 && !hasRevealed && (
        <div className="reveal-section stagger-in">
          <h3>// REVEAL YOUR MOVE</h3>
          <p style={{ color: 'hsla(180, 100%, 80%, 0.8)', marginBottom: '1rem' }}>
            Enter your secret nonce to decrypt your move:
          </p>
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
            {isRevealingMove ? '[ REVEALING... ]' : '[ REVEAL MOVE ]'}
          </button>
        </div>
      )}

      {/* Claim Timeout */}
      {gameData.state !== 3 && gameData.state !== 4 && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            className="action-btn"
            onClick={handleClaimTimeout}
            disabled={isClaiming}
            style={{
              background: 'linear-gradient(135deg, hsla(320, 100%, 60%, 0.3), hsla(320, 100%, 60%, 0.2))',
              border: '1px solid hsla(320, 100%, 60%, 0.4)'
            }}
          >
            {isClaiming ? '[ PROCESSING... ]' : '[ CLAIM TIMEOUT ]'}
          </button>
          <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem', fontFamily: 'JetBrains Mono' }}>
            Execute if opponent exceeds time limit
          </p>
        </div>
      )}
    </div>
  )
}
