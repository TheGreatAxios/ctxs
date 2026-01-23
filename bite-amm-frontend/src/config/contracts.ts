import ConfidentialLimitOrderBookABI from "../../abi/ConfidentialLimitOrderBook.json";
import SushiSwapV2FactoryABI from "../../abi/SushiSwapV2Factory.json";
import SushiSwapV2PairABI from "../../abi/SushiSwapV2Pair.json";
import type { Address } from "viem";

// SKALE BITE V2 Precompile Addresses (fixed across all SKALE chains)
export const PRECOMPILES = {
  encryptTE: "0x0000000000000000000000000000000000001002" as Address,
  submitCTX: "0x0000000000000000000000000000000000001001" as Address,
  encryptECIES: "0x0000000000000000000000000000000000001003" as Address,
} as const;

// Default CTX gas cost (0.01 sFUEL)
// This is the recommended amount to deposit per order
export const CTX_GAS_COST = BigInt('10000000000000000') as bigint;

// Contract config per chain
interface ChainContractConfig {
  limitOrderBook: Address;
  factory: Address;
}

// Chain-specific contract addresses
const CHAIN_CONTRACTS: Record<number, ChainContractConfig> = {
  // SKALE Testnet (base-sepolia) - Chain ID: 2090472038
  2090472038: {
    limitOrderBook: (process.env.NEXT_PUBLIC_LOB_ADDRESS ?? '0x2eDE561850b1EE5265D457016bA6018112b9D7A1') as Address,
    factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? '0xD6818aa542B30A06F476E859ED2566AFea349d25') as Address,
  },
  // SKALE CTX Chain (id: 3564619) - Legacy, kept for reference
  3564619: {
    limitOrderBook: (process.env.NEXT_PUBLIC_LOB_ADDRESS ?? '0x0000000000000000000000000000000000000000') as Address,
    factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? '0x0000000000000000000000000000000000000000') as Address,
  },
};

// Get contract addresses for a specific chain
export const getContractForChain = (
  chainId: number,
): ChainContractConfig => {
  return (
    CHAIN_CONTRACTS[chainId] ?? {
      limitOrderBook: '0x0000000000000000000000000000000000000000' as Address,
      factory: '0x0000000000000000000000000000000000000000' as Address,
    }
  );
};

// Legacy export for backward compatibility
// @deprecated Use getContractForChain(chainId) instead
export const CONTRACTS = {
  precompiles: PRECOMPILES,
  limitOrderBook: '' as Address, // Use getContractForChain() instead
  factory: '' as Address, // Use getContractForChain() instead
  router: '' as Address, // Use getContractForChain() instead
  CTX_GAS_COST,
} as const;

// Legacy exports for backward compatibility
// @deprecated Use getContractForChain() instead
export const FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export type ContractAddress = keyof typeof CONTRACTS;

// Contract ABIs
export const CONTRACT_ABIS = {
  limitOrderBook: ConfidentialLimitOrderBookABI,
  factory: SushiSwapV2FactoryABI,
  pair: SushiSwapV2PairABI,
} as const;

// Event signatures for limit order events
export const EVENT_SIGNATURES = {
  OrderSubmitted: "OrderSubmitted(address,uint256,uint256,bytes,bytes)",
  OrderFilled: "OrderFilled(address,uint256,uint256)",
  OrderCancelled: "OrderCancelled(address,uint256)",
} as const;

// Alias for compatibility with eventSync service
export const getContractConfig = getContractForChain;
