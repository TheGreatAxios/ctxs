import { useState } from 'react'
import { useWriteContract } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import { Gauge, File, Scissors } from 'lucide-react'
import { CONTRACT_ABI } from '../config/contract'

type Move = 0 | 1 | 2 | 3

interface JoinGameProps {
  contractAddress: string
  onGameJoined: (gameId: number) => void
}

export default function JoinGame({ contractAddress, onGameJoined }: JoinGameProps) {
  const [gameId, setGameId] = useState('')
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [nonce, setNonce] = useState<bigint | null>(null)
  const [showNonce, setShowNonce] = useState(false)

  const { writeContract, isPending, error } = useWriteContract()

  const moves: { value: Move; icon: any; label: string }[] = [
    { value: 1, icon: Gauge, label: 'ROCK' },
    { value: 2, icon: File, label: 'PAPER' },
    { value: 3, icon: Scissors, label: 'SCISSORS' },
  ]

  const generateCommitment = (move: Move, nonceValue: bigint): `0x${string}` => {
    return keccak256(encodePacked(['uint8', 'uint256'], [move, nonceValue]))
  }

  const handleJoinGame = () => {
    if (!selectedMove || !gameId) return

    const nonceValue = BigInt(Math.floor(Math.random() * 1000000000000))
    setNonce(nonceValue)

    const commitment = generateCommitment(selectedMove, nonceValue)

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'joinGame',
      args: [BigInt(gameId), commitment],
    })

    setShowNonce(true)
    onGameJoined(Number(gameId))
  }

  return (
    <div className="card">
      <h2>// JOIN_GAME</h2>

      <div className="form-group">
        <label>Game ID</label>
        <input
          type="number"
          placeholder="Enter Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Select Your Move <span className="text-neon-purple">(ENCRYPTED)</span></label>
        <div className="move-selection">
          {moves.map((move, index) => {
            const Icon = move.icon
            return (
              <button
                key={move.value}
                className={`move-btn ${selectedMove === move.value ? 'selected' : ''}`}
                onClick={() => setSelectedMove(move.value)}
                title={move.label}
              >
                <span className="stagger-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Icon size={40} strokeWidth={2.5} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        className="action-btn"
        onClick={handleJoinGame}
        disabled={!selectedMove || !gameId || isPending}
      >
        {isPending ? '[ JOINING... ]' : '[ JOIN GAME ]'}
      </button>

      {showNonce && nonce && (
        <div className="reveal-section stagger-in">
          <h3>// SAVE YOUR SECRET</h3>
          <p style={{ color: 'hsla(180, 100%, 80%, 0.8)', marginBottom: '1rem' }}>
            Store this nonce securely to reveal your move:
          </p>
          <div className="nonce-display">{nonce.toString()}</div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.75rem', color: 'hsla(320, 100%, 70%, 0.9)' }}>
            ⚠ WARNING: Without this nonce, you cannot reveal your move
          </p>
        </div>
      )}

      {error && (
        <div className="error-message">
          ERROR: {error.message}
        </div>
      )}
    </div>
  )
}
