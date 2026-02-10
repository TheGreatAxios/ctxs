import { useState } from 'react'
import { useWriteContract } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
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

  const moves: { value: Move; emoji: string; label: string }[] = [
    { value: 1, emoji: '✊', label: 'Rock' },
    { value: 2, emoji: '✋', label: 'Paper' },
    { value: 3, emoji: '✌️', label: 'Scissors' },
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
      <h2>Join Game</h2>
      
      <div className="form-group">
        <label>Game ID</label>
        <input
          type="number"
          placeholder="Enter game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Select Your Move (Hidden)</label>
        <div className="move-selection">
          {moves.map((move) => (
            <button
              key={move.value}
              className={`move-btn ${selectedMove === move.value ? 'selected' : ''}`}
              onClick={() => setSelectedMove(move.value)}
              title={move.label}
            >
              {move.emoji}
            </button>
          ))}
        </div>
      </div>

      <button
        className="action-btn"
        onClick={handleJoinGame}
        disabled={!selectedMove || !gameId || isPending}
      >
        {isPending ? 'Joining...' : 'Join Game'}
      </button>

      {showNonce && nonce && (
        <div className="reveal-section">
          <h3>Important: Save Your Secret!</h3>
          <p>You must remember this number to reveal your move later:</p>
          <div className="nonce-display">{nonce.toString()}</div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Write this down! Without it, you cannot reveal your move and will lose the game.
          </p>
        </div>
      )}

      {error && (
        <div className="error-message">
          Error: {error.message}
        </div>
      )}
    </div>
  )
}