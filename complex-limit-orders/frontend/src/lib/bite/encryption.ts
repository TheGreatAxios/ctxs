import { toBytes, toHex } from "viem";
import { BITE } from "@skalenetwork/bite";

const MAX_DATA_SIZE = 64 * 1024; // 64KB max for BITE encryption

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
  contractAddress: string,
): Promise<`0x${string}`> {
  if (data.length > MAX_DATA_SIZE) {
    throw new Error(
      `Data size ${data.length} exceeds maximum of ${MAX_DATA_SIZE}`,
    );
  }

  const bite = new BITE(rpcUrl);
  const hexMessage = toHex(data);
  const encrypted = await bite.encryptMessageForCTX(hexMessage, contractAddress);
  return encrypted as `0x${string}`;
}

/**
 * Encrypt amount for confidential operations
 * Uses BLS threshold encryption via bite-ts
 *
 * @param amount - Amount to encrypt
 * @param rpcUrl - RPC endpoint for the SKALE chain
 * @returns Threshold-encrypted amount
 */
export async function encryptAmount(
  amount: bigint,
  rpcUrl: string,
  contractAddress: string,
): Promise<{ thresholdEncrypted: `0x${string}` }> {
  const amountBytes = toBytes(amount);
  const thresholdEncrypted = await encryptTE(amountBytes, rpcUrl, contractAddress);
  return { thresholdEncrypted };
}
