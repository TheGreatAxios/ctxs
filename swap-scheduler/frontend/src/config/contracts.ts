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
    scheduledSwapBook: '0x1a6f3a4154e88b9b08f70c4904fe0adee3af27e4' as Address,
    factory: '0xafa7aa14d2d9cf519c392cab7058586ce9849be5' as Address,
    router: '0x01aaedbb03e918a895e52f5d665d68926ae079e7' as Address,
    pairs: {
      USDC_WETH: '0x77193ef88148cbac6eb7cc5fda3bdc955bbca7ae' as Address,
      USDC_WBTC: '0x6daac8d984170edb49cf571f8d320adadf944b1d' as Address,
      USDT_WETH: '0x4ce885a58e282498cdba7c47997cfca60ed00074' as Address,
      USDT_WBTC: '0xd74aaa7d21b808189ac23eac00e2913ad9c6bf8b' as Address,
      WETH_WBTC: '0xd6ebf7d4182277a10f0aa4f813f16ead045d4bd1' as Address,
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

export const FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

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
