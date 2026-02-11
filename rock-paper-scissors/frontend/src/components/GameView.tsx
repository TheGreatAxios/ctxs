import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { ArrowLeft, Mountain, File, Scissors, Lock, Zap } from 'lucide-react'
import { CONTRACT_ABI } from '../config/contract'

interface GameViewProps {
  gameId: number
  contractAddress: string
  onClose: () => void
}

interface GameData {
  player1: string
  player2: string
  encryptedMove1: string
  encryptedMove2: string
  move1: number
  move2: number
  wagerAmount: bigint
  wagerToken: string
  state: number
  winner: string
}

const moveIcons: Record<number, any> = {
  0: Lock,
  1: Mountain,
  2: File,
  3: Scissors,
}

const moveNames: Record<number, string> = {
  0: 'ENCRYPTED',
  1: 'ROCK',
  2: 'PAPER',
  3: 'SCISSORS',
}

const stateLabels: Record<number, string> = {
  0: 'WAITING FOR PLAYER 2',
  1: 'DECRYPTING...',
  2: 'REVEALED',
  3: 'GAME OVER',
  4: 'EXPIRED',
}

export default function GameView({ gameId, contractAddress, onClose }: GameViewProps) {
  const { address } = useAccount()

  const { data: game } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: [BigInt(gameId)],
  })

  const gameData = game as GameData | undefined

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
            <div className="player-address">{gameData.player2.slice(0, 8)}...</div>
          )}
        </div>
      </div>

      {/* Wager */}
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
          <span className="text-neon-purple">SKL</span>
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

      {/* BITE Info */}
      {gameData.state !== 3 && gameData.state !== 4 && (
        <div style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, hsla(180, 100%, 50%, 0.08), hsla(280, 70%, 55%, 0.08))',
          borderRadius: '10px',
          border: '1px dashed hsla(180, 100%, 50%, 0.3)',
          textAlign: 'center'
        }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'hsla(180, 100%, 70%, 0.8)', lineHeight: '1.6' }}>
            <span className="text-neon-cyan"><Zap size={14} style={{ verticalAlign: 'middle' }} /></span> Moves encrypted via BITE protocol<br />
            <span className="text-neon-cyan"><Zap size={14} style={{ verticalAlign: 'middle' }} /></span> CTX auto-decrypts in next block<br />
            <span className="text-neon-cyan"><Zap size={14} style={{ verticalAlign: 'middle' }} /></span> No manual reveal required
          </p>
        </div>
      )}
    </div>
  )
}
