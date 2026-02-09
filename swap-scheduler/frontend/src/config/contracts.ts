import ScheduledSwapBookABI from "../../abi/ScheduledSwapBook.json";
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
  scheduledSwapBook: Address;
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
    scheduledSwapBook: '0x6EB7DdA20486a5ebFa904Ab310f8e7336ca6D803' as Address,
    factory: '0xEF84a39A2b0a600EA91bB6927DB519f5834ebf36' as Address,
    router: '0x2dB91801b667ED6Cad305c9882F3bc0D2EDa6b24' as Address,
    pairs: {
      USDC_WETH: '0x983B72Fc406aE36906c59a9EF8c695A720E204e9' as Address,
      USDC_WBTC: '0x4F27ccB25320192aCa416E8Ab3587db5E66E44e6' as Address,
      USDT_WETH: '0x1Fc90846f98B4F9c7ee2844acfE7dFF67e8C31e8' as Address,
      USDT_WBTC: '0xEba32eCc184d7BcfA5B792C2e6688a2999CC31bd' as Address,
      WETH_WBTC: '0xE1a53F17Bbc434242047FfB4112aCCd6De6D3201' as Address,
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
  scheduledSwapBook: '' as Address,
  factory: '' as Address,
  router: '' as Address,
  CTX_GAS_COST,
} as const;

export const FACTORY_ADDRESS = '0xEF84a39A2b0a600EA91bB6927DB519f5834ebf36' as Address;
export const ROUTER_ADDRESS = '0x2dB91801b667ED6Cad305c9882F3bc0D2EDa6b24' as Address;

export type ContractAddress = keyof typeof CONTRACTS;

// Contract ABIs
export const CONTRACT_ABIS = {
  scheduledSwapBook: ScheduledSwapBookABI,
  factory: BiteSwapV2FactoryABI,
  router: BiteSwapV2RouterABI,
  pair: BiteSwapV2PairABI,
} as const;

// Event signatures for scheduled swap events
export const EVENT_SIGNATURES = {
  ScheduledSwapSubmitted: "ScheduledSwapSubmitted(address,address,uint256,bool,uint256)",
  ScheduledSwapCancelled: "ScheduledSwapCancelled(address,address,uint256)",
  PriceUpdated: "PriceUpdated(address,uint256)",
  SwapsChecked: "SwapsChecked(address,uint256)",
  SwapExecuted: "SwapExecuted(address,uint256,address,uint256,uint256)",
  SwapFailed: "SwapFailed(address,uint256,string)",
} as const;

export const getContractConfig = getContractForChain;

export function useContracts() {
  const contracts = getContractForChain(TARGET_CHAIN_ID);
  if (!contracts) {
    throw new Error(`Contracts not configured for chain ${TARGET_CHAIN_ID}`);
  }
  return contracts;
}
