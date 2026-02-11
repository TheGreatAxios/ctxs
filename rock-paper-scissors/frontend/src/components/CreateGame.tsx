import { useState } from 'react'
import { useWriteContract, useReadContract, useAccount, usePublicClient, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { Mountain, File, Scissors, Wallet, CheckCircle2, Copy } from 'lucide-react'
import { CONTRACT_ABI, TOKEN_ADDRESS, ERC20_ABI } from '../config/contract'
import { BITE } from '@skalenetwork/bite'

type Move = 1 | 2 | 3

interface CreateGameProps {
  contractAddress: string
  onGameCreated?: (gameId: number) => void
}

export default function CreateGame({ contractAddress, onGameCreated }: CreateGameProps) {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [wagerAmount, setWagerAmount] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createTxHash, setCreateTxHash] = useState<`0x${string}` | undefined>()
  const [createdGameId, setCreatedGameId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const { writeContract, isPending, error } = useWriteContract()

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

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
    const rpcUrl = 'https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2'
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
        const approveHash = await writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress as `0x${string}`, amount],
        })
        // Wait for approval to confirm BEFORE proceeding
        if (approveHash && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          await refetchAllowance()
        }
        setIsApproving(false)
      }

      // Encrypt and create game (only after approval completes if needed)
      setIsEncrypting(true)
      const encryptedMove = await encryptMove(selectedMove)
      setIsEncrypting(false)

      setIsCreating(true)
      const hash = await writeContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'createGame',
        args: [encryptedMove as `0x${string}`, amount, tokenAddress as `0x${string}`],
      })
      setCreateTxHash(hash)
      setIsCreating(false)
    } catch (e) {
      console.error('Error:', e)
      setIsApproving(false)
      setIsEncrypting(false)
      setIsCreating(false)
    }
  }

  // Extract gameId from transaction receipt
  if (receipt && createdGameId === null) {
    // The GameCreated event has gameId as indexed parameter
    const gameCreatedLog = receipt.logs.find((log: any) =>
      log.address?.toLowerCase() === contractAddress.toLowerCase()
    )
    if (gameCreatedLog) {
      // For createGame, gameId is returned as the nextGameId - 1
      // We can query nextGameId - 1, or parse from logs
      publicClient?.readContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'nextGameId',
      }).then((nextId) => {
        const gameId = Number(nextId) - 1
        setCreatedGameId(gameId)
        onGameCreated?.(gameId)
      })
    }
  }

  const needsApproval = wagerAmount && allowance !== undefined && balance !== undefined
    ? parseEther(wagerAmount) > (allowance || 0n)
    : wagerAmount !== ''

  const balanceFormatted = balance ? (Number(balance) / 1e18).toFixed(2) : '0.00'
  const allowanceFormatted = allowance ? (Number(allowance) / 1e18).toFixed(2) : '0.00'

  const copyGameId = () => {
    if (createdGameId) {
      navigator.clipboard.writeText(createdGameId.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="card">
      <h2>// CREATE_GAME</h2>

      {/* Success Message with Game ID */}
      {createdGameId !== null && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, hsla(120, 100%, 40%, 0.2), hsla(180, 100%, 50%, 0.1))',
          borderRadius: '12px',
          border: '1px solid hsla(120, 100%, 50%, 0.4)',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-neon-green" style={{ animation: 'scaleIn 0.3s ease-out' }} />
            <span className="text-lg font-bold text-neon-green" style={{ fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
              GAME CREATED
            </span>
          </div>
          <div className="flex items-center justify-between" style={{
            background: 'hsla(120, 100%, 20%, 0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid hsla(120, 100%, 40%, 0.3)',
          }}>
            <div>
              <span style={{ color: 'hsla(180, 100%, 70%, 0.8)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono' }}>
                GAME ID
              </span>
              <div className="text-2xl font-bold text-neon-cyan" style={{ fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>
                #{createdGameId}
              </div>
            </div>
            <button
              onClick={copyGameId}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
              style={{
                background: copied ? 'hsla(120, 100%, 40%, 0.3)' : 'hsla(180, 100%, 50%, 0.2)',
                border: `1px solid ${copied ? 'hsla(120, 100%, 50%, 0.4)' : 'hsla(180, 100%, 50%, 0.3)'}`,
                cursor: 'pointer',
              }}
            >
              <Copy className="w-4 h-4" style={{ color: copied ? 'hsla(120, 100%, 60%, 1)' : 'hsla(180, 100%, 70%, 1)' }} />
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'JetBrains Mono',
                color: copied ? 'hsla(120, 100%, 60%, 1)' : 'hsla(180, 100%, 70%, 1)',
              }}>
                {copied ? 'COPIED!' : 'COPY'}
              </span>
            </button>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'hsla(180, 100%, 70%, 0.7)', fontFamily: 'JetBrains Mono' }}>
            Share this Game ID with another player to join your game.
          </p>
        </div>
      )}

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
                disabled={isCreating || isApproving || isEncrypting}
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
          disabled={isCreating || isApproving || isEncrypting}
        />
      </div>

      <button
        className="action-btn"
        onClick={handleCreateGame}
        disabled={!selectedMove || isCreating || isEncrypting || isApproving || createdGameId !== null}
        style={{
          opacity: (!selectedMove || isCreating || isEncrypting || isApproving || createdGameId !== null) ? 0.5 : 1,
          cursor: (!selectedMove || isCreating || isEncrypting || isApproving || createdGameId !== null) ? 'not-allowed' : 'pointer',
        }}
      >
        {isApproving ? (
          <span className="flex items-center gap-2">
            <span className="inline-block animate-spin">⚙</span>
            [ APPROVING TOKEN... ]
          </span>
        ) : isEncrypting ? (
          <span className="flex items-center gap-2">
            <span className="inline-block animate-pulse">🔐</span>
            [ ENCRYPTING MOVE... ]
          </span>
        ) : isCreating || createTxHash ? (
          <span className="flex items-center gap-2">
            <span className="inline-block animate-spin">⚙</span>
            [ CREATING GAME... ]
          </span>
        ) : createdGameId !== null ? (
          '[ GAME CREATED ✓ ]'
        ) : (
          '[ CREATE GAME ]'
        )}
      </button>

      {error && (
        <div className="error-message">
          ERROR: {error.message}
        </div>
      )}
    </div>
  )
}
