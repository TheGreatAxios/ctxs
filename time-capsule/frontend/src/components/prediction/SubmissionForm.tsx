import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { NOSTRADAMUS_REGISTRY_ABI } from '../../abis/NostradamusRegistry';
import { useEncryptPrediction } from '../../hooks/useEncryptPrediction';
import { CTX_GAS_COST } from '../../config/contracts';

type SubmissionFormProps = {
  contractAddress: `0x${string}`;
  onSuccess?: () => void;
};

const MIN_REVEAL_DELAY = 1;
const MAX_REVEAL_DELAY = 100000;

export function SubmissionForm({ contractAddress, onSuccess }: SubmissionFormProps) {
  const { isConnected } = useAccount();
  const { encrypt, encrypted, isEncrypting, error: encryptError, reset } = useEncryptPrediction();

  const { writeContract, isPending, error: writeError } = useWriteContract();

  const [prediction, setPrediction] = useState('');
  const [description, setDescription] = useState('');
  const [revealDelay, setRevealDelay] = useState('100');
  const [formError, setFormError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setFormError(null);

    if (!isConnected) {
      setFormError('Please connect your wallet');
      return false;
    }

    if (!prediction.trim()) {
      setFormError('Prediction value is required');
      return false;
    }

    if (!description.trim()) {
      setFormError('Description is required');
      return false;
    }

    const delay = parseInt(revealDelay, 10);
    if (isNaN(delay) || delay < MIN_REVEAL_DELAY || delay > MAX_REVEAL_DELAY) {
      setFormError(`Reveal delay must be between ${MIN_REVEAL_DELAY} and ${MAX_REVEAL_DELAY} blocks`);
      return false;
    }

    return true;
  };

  const handleEncrypt = async () => {
    if (!validateForm()) return;
    await encrypt(prediction);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!encrypted) {
      setFormError('Please encrypt the prediction first');
      return;
    }

    writeContract(
      {
        address: contractAddress,
        abi: NOSTRADAMUS_REGISTRY_ABI,
        functionName: 'submitPrediction',
        args: [encrypted, BigInt(parseInt(revealDelay, 10)), description],
        value: CTX_GAS_COST,
      },
      {
        onSuccess: () => {
          reset();
          setPrediction('');
          setDescription('');
          setRevealDelay('100');
          onSuccess?.();
        },
      }
    );
  };

  const error = formError || encryptError || writeError;

  return (
    <form onSubmit={handleSubmit} className="submission-form">
      <h3>Submit New Prediction</h3>

      <div className="form-group">
        <label htmlFor="prediction">Prediction Value (to be encrypted)</label>
        <input
          id="prediction"
          type="text"
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Enter your prediction..."
          disabled={isEncrypting || isPending}
          className="form-input"
        />
        <p className="form-hint">This value will be encrypted and only revealed after the delay</p>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description (public)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you're predicting..."
          disabled={isEncrypting || isPending}
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label htmlFor="revealDelay">Reveal Delay (blocks)</label>
        <input
          id="revealDelay"
          type="number"
          min={MIN_REVEAL_DELAY}
          max={MAX_REVEAL_DELAY}
          value={revealDelay}
          onChange={(e) => setRevealDelay(e.target.value)}
          disabled={isEncrypting || isPending}
          className="form-input"
        />
        <p className="form-hint">
          ~{Math.floor(parseInt(revealDelay) / 5)} minutes on SKALE (~5s block time)
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      <div className="form-actions">
        {!encrypted ? (
          <button
            type="button"
            onClick={handleEncrypt}
            disabled={isEncrypting || !isConnected}
            className="btn-primary"
          >
            {isEncrypting ? 'Encrypting...' : 'Encrypt Prediction'}
          </button>
        ) : (
          <>
            <div className="encrypted-status">
              <span>Encrypted: {encrypted.slice(0, 10)}...{encrypted.slice(-8)}</span>
              <button
                type="button"
                onClick={reset}
                disabled={isPending}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
            <button
              type="submit"
              disabled={isPending || !isConnected}
              className="btn-primary"
            >
              {isPending ? 'Submitting...' : `Submit (0.01 sFUEL)`}
            </button>
          </>
        )}
      </div>

      {!isConnected && (
        <div className="connect-prompt">
          Please connect your wallet to submit a prediction
        </div>
      )}
    </form>
  );
}
