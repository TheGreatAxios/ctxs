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
    limitOrderBook: '0x11a0d3f5be17353e13Cf7b7CB9877b7fbE8a187a' as Address,
    factory: '0xE5d5c7B44A3B60201ba944eCF8e3476c6FBFf4e0' as Address,
    router: '0xB21aa5b8de0e7854675e78513F2CF89D08b4Eaa4' as Address,
    pairs: {
      USDC_WETH: '0x61a840adb0c327945c98C2975b1a6B8535072780' as Address,
      USDC_WBTC: '0x6217f4e65806b61735E546C19821404645701E0D' as Address,
      USDT_WETH: '0x6db47AbfbAC30a91cE9667054f16e2968F58Fb06' as Address,
      USDT_WBTC: '0xB38100d8d0789ce23d9C0F8D1C12dB8251d38a7B' as Address,
      WETH_WBTC: '0xFF9731319aF6cb2191b0A74fd074FC1dcE9cd368' as Address,
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
