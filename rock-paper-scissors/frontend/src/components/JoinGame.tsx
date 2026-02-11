import { useState } from 'react'
import { useWriteContract, useReadContract, useAccount, usePublicClient, useWaitForTransactionReceipt } from 'wagmi'
import { Mountain, File, Scissors, Wallet, Loader2, CheckCircle2 } from 'lucide-react'
import { CONTRACT_ABI, TOKEN_ADDRESS, ERC20_ABI } from '../config/contract'
import { BITE } from '@skalenetwork/bite'

type Move = 1 | 2 | 3

interface JoinGameProps {
  contractAddress: string
  onGameJoined: (gameId: number) => void
}

interface GameData {
  player1: string
  player2: string
  wagerAmount: bigint
  wagerToken: string
  state: number
}

export default function JoinGame({ contractAddress, onGameJoined }: JoinGameProps) {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [gameId, setGameId] = useState('')
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [joinTxHash, setJoinTxHash] = useState<`0x${string}` | undefined>()
  const [joinedSuccessfully, setJoinedSuccessfully] = useState(false)

  const { writeContract, isPending, error } = useWriteContract()

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: joinTxHash,
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

  // Get game details for wager amount
  const { data: gameData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: !!gameId,
    },
  }) as { data: GameData | undefined }

  const tokenAddress = chainId ? TOKEN_ADDRESS[chainId as keyof typeof TOKEN_ADDRESS] : undefined
  const wagerAmount = gameData?.wagerAmount

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

  // CTX gas payment amount (0.06 ETH) - matches contract CTX_GAS_PAYMENT
  const CTX_GAS_PAYMENT = BigInt(60000000000000000) // 0.06 ether for 2.5M gas limit

  const handleJoinGame = async () => {
    if (!selectedMove || !gameId || !wagerAmount || !tokenAddress) return

    try {
      // Check if approval is needed
      const needsApproval = allowance !== undefined && wagerAmount > (allowance || 0n)

      if (needsApproval) {
        setIsApproving(true)
        const approveHash = await writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress as `0x${string}`, wagerAmount],
        })
        // Wait for approval to confirm BEFORE proceeding
        if (approveHash && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          // Refetch allowance after approval confirms
          await refetchAllowance()
        }
        setIsApproving(false)
      }

      // Encrypt move (only after approval completes if needed)
      setIsEncrypting(true)
      const encryptedMove = await encryptMove(selectedMove)
      setIsEncrypting(false)

      // Join game with CTX gas payment
      setIsJoining(true)
      const joinHash = await writeContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId), encryptedMove as `0x${string}`],
        value: CTX_GAS_PAYMENT,
      })
      setJoinTxHash(joinHash)
      setIsJoining(false)
    } catch (e) {
      console.error('Error:', e)
      setIsApproving(false)
      setIsEncrypting(false)
      setIsJoining(false)
    }
  }

  // Handle successful join
  if (receipt && !joinedSuccessfully) {
    setJoinedSuccessfully(true)
    onGameJoined(Number(gameId))
  }

  const needsApproval = wagerAmount && allowance !== undefined
    ? wagerAmount > (allowance || 0n)
    : false

  const balanceFormatted = balance ? (Number(balance) / 1e18).toFixed(2) : '0.00'
  const allowanceFormatted = allowance ? (Number(allowance) / 1e18).toFixed(2) : '0.00'
  const wagerFormatted = wagerAmount ? (Number(wagerAmount) / 1e18).toFixed(2) : '0.00'

  const isLoadingGame = gameId && !gameData

  return (
    <div className="card">
      <h2>// JOIN_GAME</h2>

      {/* Success Message */}
      {joinedSuccessfully && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, hsla(120, 100%, 40%, 0.2), hsla(180, 100%, 50%, 0.1))',
          borderRadius: '12px',
          border: '1px solid hsla(120, 100%, 50%, 0.4)',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-neon-green" style={{ animation: 'scaleIn 0.3s ease-out' }} />
            <div>
              <span className="text-lg font-bold text-neon-green" style={{ fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
                GAME JOINED
              </span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'hsla(180, 100%, 70%, 0.7)', fontFamily: 'JetBrains Mono' }}>
                Waiting for moves to be decrypted and winner to be determined...
              </p>
            </div>
          </div>
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
        <label>Game ID</label>
        <input
          type="number"
          placeholder="Enter Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          disabled={isJoining || isApproving || isEncrypting || joinedSuccessfully}
        />
      </div>

      {isLoadingGame && (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" style={{ margin: '0 auto' }} />
        </div>
      )}

      {gameData && gameData.player1 !== '0x0000000000000000000000000000000000000000' && (
        <>
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, hsla(280, 70%, 50%, 0.1), hsla(280, 70%, 55%, 0.1))',
            borderRadius: '10px',
            border: '1px solid hsla(280, 70%, 55%, 0.3)',
            fontFamily: 'JetBrains Mono',
            fontSize: '0.85rem',
          }}>
            <div className="flex justify-between">
              <span style={{ color: 'hsla(280, 70%, 70%, 0.8)' }}>Wager:</span>
              <span className="text-neon-purple">{wagerFormatted} SKL</span>
            </div>
            <div className="flex justify-between mt-2">
              <span style={{ color: 'hsla(280, 70%, 70%, 0.8)' }}>CTX Gas (2.5M limit):</span>
              <span className="text-neon-cyan">0.06 ETH</span>
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
                    disabled={isJoining || isApproving || isEncrypting || joinedSuccessfully}
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
            disabled={!selectedMove || !gameId || !wagerAmount || isJoining || isEncrypting || isApproving || joinedSuccessfully}
            style={{
              opacity: (!selectedMove || !gameId || !wagerAmount || isJoining || isEncrypting || isApproving || joinedSuccessfully) ? 0.5 : 1,
              cursor: (!selectedMove || !gameId || !wagerAmount || isJoining || isEncrypting || isApproving || joinedSuccessfully) ? 'not-allowed' : 'pointer',
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
            ) : isJoining || joinTxHash ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin">⚙</span>
                [ JOINING GAME... ]
              </span>
            ) : joinedSuccessfully ? (
              '[ JOINED ✓ ]'
            ) : (
              '[ JOIN GAME ]'
            )}
          </button>
        </>
      )}

      {error && (
        <div className="error-message">
          ERROR: {error.message}
        </div>
      )}
    </div>
  )
}
