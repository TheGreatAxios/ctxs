import { useState, useCallback } from 'react';
import { encryptPrediction } from '../lib/bite/encryption';
import { RPC_URL } from '../config/contracts';

type EncryptionState = {
  encrypted: `0x${string}` | null;
  isEncrypting: boolean;
  error: Error | null;
};

type UseEncryptPredictionReturn = {
  encrypt: (plaintext: string) => Promise<void>;
  reset: () => void;
} & EncryptionState;

export function useEncryptPrediction(): UseEncryptPredictionReturn {
  const [state, setState] = useState<EncryptionState>({
    encrypted: null,
    isEncrypting: false,
    error: null,
  });

  const encrypt = useCallback(async (plaintext: string) => {
    setState({ encrypted: null, isEncrypting: true, error: null });

    try {
      if (!plaintext || plaintext.trim().length === 0) {
        throw new Error('Prediction value cannot be empty');
      }

      const encryptedHex = await encryptPrediction(plaintext, RPC_URL);
      setState({ encrypted: encryptedHex, isEncrypting: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Encryption failed');
      setState({ encrypted: null, isEncrypting: false, error });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ encrypted: null, isEncrypting: false, error: null });
  }, []);

  return {
    encrypt,
    reset,
    ...state,
  };
}
