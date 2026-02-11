import { useState, useEffect } from 'react'
import { useReadContract, useBlockNumber } from 'wagmi'
import { List, Search } from 'lucide-react'
import { CONTRACT_ABI } from '../config/contract'

interface GameListProps {
  contractAddress: string
  onSelectGame: (gameId: number) => void
}

export default function GameList({ contractAddress, onSelectGame }: GameListProps) {
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

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-5 h-5 text-neon-cyan" />
        <h2 style={{ margin: 0 }}>// GAME_BROWSER</h2>
      </div>

      <p style={{ color: 'hsla(180, 100%, 70%, 0.8)', marginBottom: '1.5rem', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
        <span className="text-neon-purple">NEXT_GAME_ID:</span> #{nextGameId}
      </p>

      <div className="form-group">
        <label className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          SEARCH GAME
        </label>
        <input
          type="number"
          placeholder="Enter Game ID..."
          onChange={(e) => {
            const id = parseInt(e.target.value)
            if (id >= 0) onSelectGame(id)
          }}
        />
      </div>

      <div className="mt-6 p-4 rounded-lg" style={{
        background: 'linear-gradient(135deg, hsla(280, 70%, 25%, 0.15), hsla(280, 70%, 15%, 0.2))',
        border: '1px dashed hsla(280, 70%, 55%, 0.3)'
      }}>
        <p style={{ fontSize: '0.8rem', color: 'hsla(180, 100%, 70%, 0.8)', fontFamily: 'JetBrains Mono', lineHeight: '1.6' }}>
          <span className="text-neon-cyan">▸</span> Games indexed by ID
          <br />
          <span className="text-neon-cyan">▸</span> Enter ID above to view details
          <br />
          <span className="text-neon-cyan">▸</span> All data on-chain
        </p>
      </div>
    </div>
  )
}
