import { toBytes, toHex } from "viem";
import { BITE } from "@skalenetwork/bite";

const MAX_DATA_SIZE = 64 * 1024;

/**
 * Encrypt data using BLS threshold encryption via bite-ts library
 */
export async function encryptTE(
  data: Uint8Array,
  rpcUrl: string,
): Promise<`0x${string}`> {
  if (data.length > MAX_DATA_SIZE) {
    throw new Error(`Data size ${data.length} exceeds maximum of ${MAX_DATA_SIZE}`);
  }

  const bite = new BITE(rpcUrl);
  const hexMessage = toHex(data);
  const encrypted = await bite.encryptMessage(hexMessage);
  return encrypted as `0x${string}`;
}

/**
 * Encrypt a secret number for Liar's Yield (0-100)
 */
export async function encryptSecret(
  secret: number,
  rpcUrl: string,
): Promise<{ encryptedSecret: `0x${string}` }> {
  const secretBytes = toBytes(BigInt(secret));
  const encryptedSecret = await encryptTE(secretBytes, rpcUrl);
  return { encryptedSecret };
}
