import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useBlockNumber } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ABI } from '../config/contract'

interface GameListProps {
  contractAddress: string
  onSelectGame: (gameId: number) => void
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

const stateLabels: Record<number, string> = {
  0: 'Waiting',
  1: 'Committed',
  2: 'Revealing',
  3: 'Finished',
  4: 'Expired',
}

const stateClasses: Record<number, string> = {
  0: 'status-created',
  1: 'status-committed',
  2: 'status-revealed',
  3: 'status-finished',
  4: 'status-expired',
}

export default function GameList({ contractAddress, onSelectGame }: GameListProps) {
  const { address } = useAccount()
  const [games, setGames] = useState<{ id: number; data: GameData }[]>([])
  const [nextGameId, setNextGameId] = useState(0)

  // Poll for latest block to refresh
  useBlockNumber({ watch: true })

  // Fetch next game ID to know how many games exist
  const { data: gameCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'nextGameId',
  })

  // Fetch recent games
  useEffect(() => {
    if (gameCount) {
      setNextGameId(Number(gameCount))
    }
  }, [gameCount])

  // For now, show placeholder - in a real app, you'd index events or use a subgraph
  return (
    <div className="card">
      <h2>Active Games</h2>
      <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
        Next Game ID: {nextGameId}
      </p>
      <div className="form-group">
        <label>Enter Game ID to View</label>
        <input
          type="number"
          placeholder="Game ID"
          onChange={(e) => {
            const id = parseInt(e.target.value)
            if (id >= 0) onSelectGame(id)
          }}
        />
      </div>
      <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
        Games are indexed by ID. Enter any game ID above to view its details.
      </p>
    </div>
  )
}