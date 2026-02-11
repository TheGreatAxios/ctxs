import { useState, useEffect } from 'react'
import { useWriteContract, useReadContract, useAccount } from 'wagmi'
import { parseEther, keccak256, encodePacked } from 'viem'
import { Gauge, File, Scissors, Wallet } from 'lucide-react'
import { CONTRACT_ABI, TOKEN_ADDRESS, ERC20_ABI } from '../config/contract'

type Move = 0 | 1 | 2 | 3

interface CreateGameProps {
  contractAddress: string
}

export default function CreateGame({ contractAddress }: CreateGameProps) {
  const { address, chainId } = useAccount()
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [wagerAmount, setWagerAmount] = useState('')
  const [nonce, setNonce] = useState<bigint | null>(null)
  const [showNonce, setShowNonce] = useState(false)

  const { writeContract: createGame, isPending: isCreating, error } = useWriteContract()
  const { writeContract: approveToken, isPending: isApproving } = useWriteContract()

  // Get token balance
  const { data: balance } = useReadContract({
    address: chainId ? TOKEN_ADDRESS[chainId as keyof typeof TOKEN_ADDRESS] as `0x${string}` : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Get current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: chainId ? TOKEN_ADDRESS[chainId as keyof typeof TOKEN_ADDRESS] as `0x${string}` : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, contractAddress as `0x${string}`] : undefined,
  })

  const tokenAddress = chainId ? TOKEN_ADDRESS[chainId as keyof typeof TOKEN_ADDRESS] : undefined

  const moves: { value: Move; icon: any; label: string }[] = [
    { value: 1, icon: Gauge, label: 'ROCK' },
    { value: 2, icon: File, label: 'PAPER' },
    { value: 3, icon: Scissors, label: 'SCISSORS' },
  ]

  const generateCommitment = (move: Move, nonceValue: bigint): `0x${string}` => {
    return keccak256(encodePacked(['uint8', 'uint256'], [move, nonceValue]))
  }

  const handleApprove = () => {
    if (!tokenAddress) return
    // Approve maximum uint256 for convenience
    approveToken({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [contractAddress as `0x${string}`, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
    })
  }

  const handleCreateGame = () => {
    if (!selectedMove || !tokenAddress) return

    const nonceValue = BigInt(Math.floor(Math.random() * 1000000000000))
    setNonce(nonceValue)

    const commitment = generateCommitment(selectedMove, nonceValue)
    const amount = wagerAmount ? parseEther(wagerAmount) : BigInt(0)

    createGame({
      address: contractAddress as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'createGame',
      args: [commitment, amount, tokenAddress],
      value: BigInt(0),
    })

    setShowNonce(true)
  }

  const needsApproval = wagerAmount && allowance && balance
    ? parseEther(wagerAmount) > allowance
    : false

  const balanceFormatted = balance ? (Number(balance) / 1e18).toFixed(2) : '0.00'
  const allowanceFormatted = allowance ? (Number(allowance) / 1e18).toFixed(2) : '0.00'

  return (
    <div className="card">
      <h2>// CREATE_GAME</h2>

      {/* Token Balance Display */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, hsla(180, 100%, 50%, 0.1), hsla(280, 70%, 55%, 0.1))',
        borderRadius: '10px',
        border: '1px solid hsla(180, 100%, 50%, 0.3)',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>
            SKL TOKEN
          </span>
        </div>
        <div className="flex justify-between" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
          <span style={{ color: 'hsla(180, 100%, 70%, 0.8)' }}>Balance:</span>
          <span className="text-neon-cyan">{balanceFormatted} SKL</span>
        </div>
        <div className="flex justify-between" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
          <span style={{ color: 'hsla(180, 100%, 70%, 0.8)' }}>Allowance:</span>
          <span className={needsApproval ? 'text-neon-pink' : 'text-neon-green'}>
            {allowanceFormatted} SKL
          </span>
        </div>
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

      <div className="form-group">
        <label>Wager Amount (SKL)</label>
        <input
          type="number"
          step="0.001"
          placeholder="0.0"
          value={wagerAmount}
          onChange={(e) => setWagerAmount(e.target.value)}
        />
      </div>

      {/* Approve Button */}
      {needsApproval && (
        <button
          className="action-btn"
          onClick={handleApprove}
          disabled={isApproving}
          style={{
            background: 'linear-gradient(135deg, hsla(140, 100%, 55%, 0.8), hsla(140, 100%, 45%, 0.8))',
            marginBottom: '1rem',
          }}
        >
          {isApproving ? '[ APPROVING... ]' : '[ APPROVE SKL ]'}
        </button>
      )}

      <button
        className="action-btn"
        onClick={handleCreateGame}
        disabled={!selectedMove || isCreating || needsApproval}
      >
        {isCreating ? '[ INITIALIZING... ]' : '[ CREATE GAME ]'}
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
