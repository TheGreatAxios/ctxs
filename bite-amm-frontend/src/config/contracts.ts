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

// Deployed addresses - Feb 2025 (checksummed)
const CHAIN_CONTRACTS: Record<number, ChainContractConfig> = {
  2090472038: {
    limitOrderBook: '0x8d413a5e31F311d1f85be177D658cF468325C88c' as Address,
    factory: '0x1E6E5070Cc24244fb4ad44Fc2115d9066794Be71' as Address,
    router: '0xfDcD856d4c3Ee3c27D63a1FCDC0597226DBe91d5' as Address,
    pairs: {
      USDC_WETH: '0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978' as Address,
      USDC_WBTC: '0xE93B97B1022Be5ea1f0e00E2bC33F6BA8E8009c4' as Address,
      USDT_WETH: '0x0752b5D83E31604EBE369cD6EBa82e0F728De739' as Address,
      USDT_WBTC: '0xB112D461eC20e5df033E090fe47d653DbdF39273' as Address,
      WETH_WBTC: '0x5eDFE72563D93A6A150FA5788FAd4F4AEC8F6D92' as Address,
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
