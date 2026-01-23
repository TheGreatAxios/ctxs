import { encodePacked, toBytes, toHex, type Address, type PublicClient } from 'viem';
import { CONTRACTS } from '@/config/contracts';

const MAX_DATA_SIZE = 64 * 1024; // 64KB max for encryptTE

/**
 * Call encryptTE precompile for threshold encryption
 * Uses SKALE network BLS threshold public key
 *
 * Precompile address: 0x0000000000000000000000000000000000001002
 * Input: raw data bytes (max 64KB)
 * Output: BLS threshold-encrypted ciphertext
 *
 * @param data - Raw data to encrypt
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns Threshold-encrypted ciphertext
 */
export async function encryptTE(
  data: Uint8Array,
  rpcUrl: string
): Promise<`0x${string}`> {
  if (data.length > MAX_DATA_SIZE) {
    throw new Error(`Data size ${data.length} exceeds maximum of ${MAX_DATA_SIZE}`);
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: CONTRACTS.precompiles.encryptTE,
          data: toHex(data),
        },
        'latest',
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`encryptTE error: ${result.error.message}`);
  }

  return result.result as `0x${string}`;
}

/**
 * Call encryptECIES precompile for user-level encryption
 * Uses secp256k1 public key for ECIES with AES-256-CBC
 *
 * Precompile address: 0x0000000000000000000000000000000000001003
 * Input: (data, pubKeyX, pubKeyY) encoded
 * Output: [IV (16)] [Ephemeral PubKey (33)] [Ciphertext (N)]
 *
 * @param data - Raw data to encrypt
 * @param pubKeyX - X coordinate of secp256k1 public key
 * @param pubKeyY - Y coordinate of secp256k1 public key
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns ECIES-encrypted ciphertext
 */
export async function encryptECIES(
  data: Uint8Array,
  pubKeyX: `0x${string}`,
  pubKeyY: `0x${string}`,
  rpcUrl: string
): Promise<`0x${string}`> {
  const inputData = encodePacked(
    ['bytes', 'bytes32', 'bytes32'],
    [toHex(data), pubKeyX, pubKeyY]
  ) as `0x${string}`;

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: CONTRACTS.precompiles.encryptECIES,
          data: inputData,
        },
        'latest',
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`encryptECIES error: ${result.error.message}`);
  }

  return result.result as `0x${string}`;
}

/**
 * Encrypt amount for confidential transfers using both TE and ECIES
 * Returns dual-encrypted data for confidential token operations
 *
 * @param amount - Amount to encrypt
 * @param userPublicKey - User's secp256k1 public key
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns Both threshold-encrypted and user-encrypted amounts
 */
export async function encryptAmount(
  amount: bigint,
  userPublicKey: { x: `0x${string}`; y: `0x${string}` },
  rpcUrl: string
): Promise<{ thresholdEncrypted: `0x${string}`; userEncrypted: `0x${string}` }> {
  const amountBytes = toBytes(amount);

  const [thresholdEncrypted, userEncrypted] = await Promise.all([
    encryptTE(amountBytes, rpcUrl),
    encryptECIES(amountBytes, userPublicKey.x, userPublicKey.y, rpcUrl),
  ]);

  return { thresholdEncrypted, userEncrypted };
}
