import { type Address, recoverPublicKey } from 'viem';
import { keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Derive secp256k1 public key coordinates from a signature
 *
 * In BITE V2, users need their secp256k1 public key for:
 * 1. Registering with confidential token contracts
 * 2. Decrypting their balances locally using ECIES
 *
 * @param message - Message that was signed
 * @param signature - Signature from the wallet
 * @returns Public key as { x, y } coordinates
 */
export async function derivePublicKeyFromSignature(
  message: string,
  signature: `0x${string}`
): Promise<{ x: `0x${string}`; y: `0x${string}` }> {
  // Hash the message to get the message hash
  const messageHash = keccak256(toBytes(message));

  // Recover public key from signature
  const publicKey = await recoverPublicKey({
    hash: messageHash,
    signature,
  });

  // Parse the public key (uncompressed format is 65 bytes: 0x04 + x + y)
  const xBytes = publicKey.slice(1, 33);
  const yBytes = publicKey.slice(33, 65);

  const x = `0x${Buffer.from(xBytes).toString('hex').padStart(64, '0')}` as `0x${string}`;
  const y = `0x${Buffer.from(yBytes).toString('hex').padStart(64, '0')}` as `0x${string}`;

  return { x, y };
}

/**
 * Derive secp256k1 public key from private key
 *
 * This is an alternative method if you have direct access to the private key
 * (e.g., in testing environments or with certain wallet providers)
 *
 * @param privateKey - The secp256k1 private key
 * @returns Public key as { x, y } coordinates
 */
export async function derivePublicKeyFromPrivateKey(
  privateKey: `0x${string}`
): Promise<{ x: `0x${string}`; y: `0x${string}` }> {
  const account = privateKeyToAccount(privateKey);
  const publicKey = account.publicKey;

  // Parse the public key (uncompressed format is 65 bytes: 0x04 + x + y)
  const xBytes = publicKey.slice(1, 33);
  const yBytes = publicKey.slice(33, 65);

  const x = `0x${Buffer.from(xBytes).toString('hex').padStart(64, '0')}` as `0x${string}`;
  const y = `0x${Buffer.from(yBytes).toString('hex').padStart(64, '0')}` as `0x${string}`;

  return { x, y };
}

/**
 * Format public key for contract registration
 *
 * Contracts typically expect (bytes32, bytes32) format
 *
 * @param publicKey - Public key as { x, y }
 * @returns Tuple of [x, y] for contract calls
 */
export function formatPublicKeyForContract(
  publicKey: { x: `0x${string}`; y: `0x${string}` }
): [`0x${string}`, `0x${string}`] {
  return [publicKey.x, publicKey.y];
}

/**
 * Validate public key coordinates
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if valid, false otherwise
 */
export function isValidPublicKey(
  x: `0x${string}`,
  y: `0x${string}`
): boolean {
  // Check that coordinates are 32 bytes each (64 hex chars + 0x prefix)
  const validX = x.length === 66;
  const validY = y.length === 66;

  return validX && validY;
}
