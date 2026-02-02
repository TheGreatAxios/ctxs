import ConfidentialLimitOrderBookABI from "../../abi/ConfidentialLimitOrderBook.json";
import BiteSwapV2FactoryABI from "../../abi/BiteSwapV2Factory.json";
import BiteSwapV2RouterABI from "../../abi/BiteSwapV2Router.json";
import BiteSwapV2PairABI from "../../abi/BiteSwapV2Pair.json";
import type { Address } from "viem";

const TARGET_CHAIN_ID = 2090472038;

// SKALE BITE V2 Precompile Addresses (fixed across all SKALE chains)
export const PRECOMPILES = {
  encryptTE: "0x0000000000000000000000000000000000001002" as Address,
  submitCTX: "0x0000000000000000000000000000000000001001" as Address,
  encryptECIES: "0x0000000000000000000000000000000000001003" as Address,
} as const;

// Default CTX gas cost (0.01 sFUEL)
export const CTX_GAS_COST = BigInt('10000000000000000') as bigint;

// Contract config per chain
interface ChainContractConfig {
  limitOrderBook: Address;
  factory: Address;
  router: Address;
  pairs: {
    USDC_WETH: Address;
    USDC_WBTC: Address;
    USDT_WETH: Address;
    USDT_WBTC: Address;
    WETH_WBTC: Address;
  };
}

const CHAIN_CONTRACTS: Record<number, ChainContractConfig> = {
  2090472038: {
    limitOrderBook: '0x1a76f24cda1e390257a5c50d007fefcfd6652132' as Address,
    factory: '0x6ebe89b1d64928e822a7b6b6eace28a7387d279b' as Address,
    router: '0x4295afa9bc0643c73ce760c9b207e6d808d8d555' as Address,
    pairs: {
      USDC_WETH: '0x403502d5c9b0990c87b966d855f2cdb2ee3bfbf8' as Address,
      USDC_WBTC: '0xddb69277c3f578715fed84f5904b954b7bfcc52c' as Address,
      USDT_WETH: '0x024c92c46e70621be3802db3afd802a4530f61cb' as Address,
      USDT_WBTC: '0x22e9f132b498f329cb188c656301666871a9f9d6' as Address,
      WETH_WBTC: '0x9aa2cff557fff26083a6aed8e20978695d6e401b' as Address,
    },
  },
};

// Get contract addresses for a specific chain
export const getContractForChain = (
  chainId: number,
): ChainContractConfig | null => {
  return CHAIN_CONTRACTS[chainId] ?? null;
};

// Legacy export for backward compatibility
export const CONTRACTS = {
  precompiles: PRECOMPILES,
  limitOrderBook: '' as Address,
  factory: '' as Address,
  router: '' as Address,
  CTX_GAS_COST,
} as const;

export const FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export type ContractAddress = keyof typeof CONTRACTS;

// Contract ABIs
export const CONTRACT_ABIS = {
  limitOrderBook: ConfidentialLimitOrderBookABI,
  factory: BiteSwapV2FactoryABI,
  router: BiteSwapV2RouterABI,
  pair: BiteSwapV2PairABI,
} as const;

// Event signatures for limit order events
export const EVENT_SIGNATURES = {
  OrderSubmitted: "OrderSubmitted(address,uint256,uint256,bytes,bytes)",
  OrderFilled: "OrderFilled(address,uint256,uint256)",
  OrderCancelled: "OrderCancelled(address,uint256)",
} as const;

export const getContractConfig = getContractForChain;

export function useContracts() {
  const contracts = getContractForChain(TARGET_CHAIN_ID);
  if (!contracts) {
    throw new Error(`Contracts not configured for chain ${TARGET_CHAIN_ID}`);
  }
  return contracts;
}
