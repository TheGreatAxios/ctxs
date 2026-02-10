import { toBytes, toHex } from "viem";
import { BITE } from "@skalenetwork/bite";

const MAX_DATA_SIZE = 64 * 1024; // 64KB max for BITE encryption

/**
 * Encrypt prediction using BLS threshold encryption via bite-ts library
 * Uses SKALE network BLS threshold public key
 *
 * @param value - Prediction string to encrypt
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns BLS threshold-encrypted prediction as hex string
 */
export async function encryptPrediction(
  value: string,
  rpcUrl: string,
): Promise<`0x${string}`> {
  // Convert string to bytes
  const valueBytes = toBytes(value);

  if (valueBytes.length > MAX_DATA_SIZE) {
    throw new Error(
      `Data size ${valueBytes.length} exceeds maximum of ${MAX_DATA_SIZE}`,
    );
  }

  // Convert to hex
  const hexValue = toHex(valueBytes);

  // Initialize BITE with RPC URL
  const bite = new BITE(rpcUrl);

  // Encrypt using threshold encryption
  const encrypted = await bite.encryptMessage(hexValue);

  return encrypted as `0x${string}`;
}

/**
 * Encrypt data using BLS threshold encryption via bite-ts library
 * Uses SKALE network BLS threshold public key
 *
 * @param data - Raw data to encrypt
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns BLS threshold-encrypted ciphertext
 */
export async function encryptTE(
  data: Uint8Array,
  rpcUrl: string,
): Promise<`0x${string}`> {
  if (data.length > MAX_DATA_SIZE) {
    throw new Error(
      `Data size ${data.length} exceeds maximum of ${MAX_DATA_SIZE}`,
    );
  }

  const bite = new BITE(rpcUrl);
  const hexMessage = toHex(data);
  const encrypted = await bite.encryptMessage(hexMessage);
  return encrypted as `0x${string}`;
}
