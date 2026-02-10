import { useState } from 'react'
import { useWriteContract, useAccount } from 'wagmi'
import { parseEther, keccak256, encodePacked } from 'viem'
import { CONTRACT_ABI } from '../config/contract'

type Move = 0 | 1 | 2 | 3

interface CreateGameProps {
  contractAddress: string
}

export default function CreateGame({ contractAddress }: CreateGameProps) {
  const { address } = useAccount()
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [wagerAmount, setWagerAmount] = useState('')
  const [tokenAddress, setTokenAddress] = useState('')
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

  const handleCreateGame = () => {
    if (!selectedMove) return
    
    const nonceValue = BigInt(Math.floor(Math.random() * 1000000000000))
    setNonce(nonceValue)
    
    const commitment = generateCommitment(selectedMove, nonceValue)
    const amount = wagerAmount ? parseEther(wagerAmount) : BigInt(0)
    const token = tokenAddress || '0x0000000000000000000000000000000000000000'
    
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'createGame',
      args: [commitment, amount, token],
      value: token === '0x0000000000000000000000000000000000000000' ? amount : BigInt(0),
    })
    
    setShowNonce(true)
  }

  return (
    <div className="card">
      <h2>Create New Game</h2>
      
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

      <div className="form-group">
        <label>Wager Amount (ETH, optional)</label>
        <input
          type="number"
          step="0.001"
          placeholder="0.0"
          value={wagerAmount}
          onChange={(e) => setWagerAmount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>ERC-20 Token Address (optional)</label>
        <input
          type="text"
          placeholder="0x..."
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
        />
      </div>

      <button
        className="action-btn"
        onClick={handleCreateGame}
        disabled={!selectedMove || isPending}
      >
        {isPending ? 'Creating...' : 'Create Game'}
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