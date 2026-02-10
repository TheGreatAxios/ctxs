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
 * Encrypt a move for Trust Protocol
 * COOPERATE = 0, DEFECT = 1
 */
export async function encryptMove(
  move: "COOPERATE" | "DEFECT",
  rpcUrl: string,
): Promise<{ encryptedMove: `0x${string}` }> {
  const moveValue = move === "COOPERATE" ? 0 : 1;
  const moveBytes = toBytes(moveValue);
  const encryptedMove = await encryptTE(moveBytes, rpcUrl);
  return { encryptedMove };
}
