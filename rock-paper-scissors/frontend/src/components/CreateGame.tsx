import { useState } from 'react'
import { useWriteContract, useReadContract, useAccount, usePublicClient } from 'wagmi'
import { parseEther } from 'viem'
import { Mountain, File, Scissors, Wallet } from 'lucide-react'
import { CONTRACT_ABI, TOKEN_ADDRESS, ERC20_ABI } from '../config/contract'
import { BITE } from '@skalenetwork/bite'

type Move = 1 | 2 | 3

interface CreateGameProps {
  contractAddress: string
}

export default function CreateGame({ contractAddress }: CreateGameProps) {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [wagerAmount, setWagerAmount] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const { writeContract, isPending, error } = useWriteContract()

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
    { value: 1, icon: Mountain, label: 'ROCK' },
    { value: 2, icon: File, label: 'PAPER' },
    { value: 3, icon: Scissors, label: 'SCISSORS' },
  ]

  // Encrypt move using BITE V2
  const encryptMove = async (move: Move): Promise<string> => {
    const moveHex = move.toString(16).padStart(2, '0')
    const rpcUrl = 'https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox'
    const bite = new BITE(rpcUrl)
    const encryptedMove = await bite.encryptMessage(moveHex)
    return encryptedMove
  }

  const handleCreateGame = async () => {
    if (!selectedMove || !tokenAddress) return

    const amount = wagerAmount ? parseEther(wagerAmount) : BigInt(0)
    const needsApproval = allowance !== undefined && amount > (allowance || 0n)

    try {
      if (needsApproval) {
        setIsApproving(true)
        const hash = await writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress as `0x${string}`, amount],
        })
        setIsApproving(false)
        // Wait for approval to confirm
        if (hash && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash })
          // Refetch allowance after approval confirms
          await refetchAllowance()
        }
      }

      // Encrypt and create game
      setIsEncrypting(true)
      const encryptedMove = await encryptMove(selectedMove)
      setIsEncrypting(false)

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'createGame',
        args: [encryptedMove as `0x${string}`, amount, tokenAddress as `0x${string}`],
        value: BigInt(0),
      })
    } catch (e) {
      console.error('Error:', e)
      setIsApproving(false)
      setIsEncrypting(false)
    }
  }

  const needsApproval = wagerAmount && allowance !== undefined && balance !== undefined
    ? parseEther(wagerAmount) > (allowance || 0n)
    : wagerAmount !== ''

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
        <label>Select Your Move <span className="text-neon-purple">(ENCRYPTED VIA BITE)</span></label>
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

      <button
        className="action-btn"
        onClick={handleCreateGame}
        disabled={!selectedMove || isPending || isEncrypting || isApproving}
      >
        {isApproving ? '[ APPROVING... ]' : isEncrypting ? '[ ENCRYPTING... ]' : isPending ? '[ CREATING... ]' : '[ CREATE GAME ]'}
      </button>

      {error && (
        <div className="error-message">
          ERROR: {error.message}
        </div>
      )}
    </div>
  )
}
