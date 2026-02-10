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
 * Encrypt a single grid position (0-15)
 */
export async function encryptPosition(
  position: number,
  rpcUrl: string,
): Promise<{ encrypted: `0x${string}` }> {
  const positionBytes = toBytes(BigInt(position));
  const encrypted = await encryptTE(positionBytes, rpcUrl);
  return { encrypted };
}

/**
 * Encrypt two shot positions (0-15 each)
 * Packs them into a single uint256: (shot1 << 8) | shot2
 */
export async function encryptShots(
  shot1: number,
  shot2: number,
  rpcUrl: string,
): Promise<{ encrypted: `0x${string}` }> {
  const packed = (BigInt(shot1) << 8n) | BigInt(shot2);
  const packedBytes = toBytes(packed);
  const encrypted = await encryptTE(packedBytes, rpcUrl);
  return { encrypted };
}
