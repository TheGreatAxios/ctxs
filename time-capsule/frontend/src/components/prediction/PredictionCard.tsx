import { useAccount, useReadContract, useWriteContract, useBlockNumber } from 'wagmi';
import { NOSTRADAMUS_REGISTRY_ABI, parsePrediction, type Prediction } from '../../abis/NostradamusRegistry';
import { formatAddress, formatBlockNumber } from '../../utils/format';

type PredictionCardProps = {
  predictionId: bigint;
  contractAddress: `0x${string}`;
};

type PredictionState = 'encrypted' | 'ready' | 'revealed' | 'cancelled';

function getPredictionState(
  prediction: Prediction | undefined,
  currentBlock: bigint
): PredictionState {
  if (!prediction?.[5]) return 'cancelled'; // !active
  if (prediction[6]) return 'revealed'; // revealed
  if (currentBlock >= prediction[3]) return 'ready'; // currentBlock >= revealBlock
  return 'encrypted';
}

function getStateEmoji(state: PredictionState): string {
  switch (state) {
    case 'encrypted': return '🔒';
    case 'ready': return '⏳';
    case 'revealed': return '✅';
    case 'cancelled': return '❌';
  }
}

function getStateText(state: PredictionState): string {
  switch (state) {
    case 'encrypted': return 'Encrypted';
    case 'ready': return 'Ready to Reveal';
    case 'revealed': return 'Revealed';
    case 'cancelled': return 'Cancelled';
  }
}

export function PredictionCard({ predictionId, contractAddress }: PredictionCardProps) {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: 103698795 });

  const { data: prediction, isLoading } = useReadContract({
    address: contractAddress,
    abi: NOSTRADAMUS_REGISTRY_ABI,
    functionName: 'getPrediction',
    args: [predictionId],
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: canReveal } = useReadContract({
    address: contractAddress,
    abi: NOSTRADAMUS_REGISTRY_ABI,
    functionName: 'canReveal',
    args: [predictionId],
    query: {
      refetchInterval: 5000,
    },
  });

  const { writeContract, isPending, error } = useWriteContract();

  const currentBlock = blockNumber ?? 0n;
  const pred = prediction ? parsePrediction(prediction) : undefined;
  const state = getPredictionState(pred, currentBlock);

  const handleReveal = () => {
    if (!canReveal) return;
    writeContract({
      address: contractAddress,
      abi: NOSTRADAMUS_REGISTRY_ABI,
      functionName: 'triggerReveal',
      args: [predictionId],
    });
  };

  if (isLoading) {
    return (
      <div className="prediction-card loading">
        <div className="card-skeleton">Loading prediction...</div>
      </div>
    );
  }

  if (!pred) {
    return null;
  }

  const blocksRemaining = pred[3] - currentBlock;
  const isOwner = connectedAddress === pred[0];

  return (
    <div className={`prediction-card state-${state}`}>
      <div className="card-header">
        <span className="card-emoji">{getStateEmoji(state)}</span>
        <span className="card-state">{getStateText(state)}</span>
        <span className="card-id">#{predictionId.toString()}</span>
      </div>

      <div className="card-body">
        <div className="card-row">
          <span className="label">Predictor:</span>
          <span className="value">
            {formatAddress(pred[0])}
            {isOwner && <span className="owner-badge">You</span>}
          </span>
        </div>

        <div className="card-row">
          <span className="label">Description:</span>
          <span className="value">{pred[4]}</span>
        </div>

        {state === 'encrypted' && (
          <div className="card-row">
            <span className="label">Reveal Block:</span>
            <span className="value">{formatBlockNumber(pred[3])}</span>
          </div>
        )}

        {state === 'encrypted' && blocksRemaining > 0n && (
          <div className="card-row">
            <span className="label">Blocks Remaining:</span>
            <span className="value countdown">{blocksRemaining.toString()}</span>
          </div>
        )}

        {state === 'revealed' && (
          <div className="card-row revealed-value">
            <span className="label">Prediction:</span>
            <span className="value">{pred[7]}</span>
          </div>
        )}

        {error && (
          <div className="card-error">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}
      </div>

      <div className="card-footer">
        {state === 'ready' && canReveal === true && (
          <button
            onClick={handleReveal}
            disabled={isPending}
            className="btn-reveal"
          >
            {isPending ? 'Revealing...' : 'Reveal Prediction'}
          </button>
        )}

        {state === 'encrypted' && (
          <div className="card-note">
            Wait {blocksRemaining.toString()} blocks to reveal
          </div>
        )}

        {state === 'revealed' && (
          <div className="card-note">
            Successfully revealed!
          </div>
        )}
      </div>
    </div>
  );
}
