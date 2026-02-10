import type { Address } from "viem";

export const CHAIN_ID = 103698795 as const;
export const CTX_GAS_COST = BigInt("10000000000000000") as bigint; // 0.01 sFUEL

// SKALE BITE V2 Precompiles (fixed across all SKALE chains)
export const PRECOMPILES = {
  submitCTX: "0x000000000000000000000000000000000000001B" as Address,
  encryptTE: "0x0000000000000000000000000000000000000020" as Address,
} as const;

export const CONTRACTS = {
  nostradamusRegistry: "0x0000000000000000000000000000000000000000" as Address,
} as const;

export const RPC_URL = "https://base-sepolia-testnet.skalenodes.com/v1/fancy-this-usable-SKALE";

export function getConfig(chainId: number) {
  if (chainId !== CHAIN_ID) return null;

  return {
    chainId,
    precompiles: PRECOMPILES,
    ctxGasCost: CTX_GAS_COST,
    rpcUrl: RPC_URL,
    ...CONTRACTS,
  };
}

export type ChainContractConfig = ReturnType<typeof getConfig>;
