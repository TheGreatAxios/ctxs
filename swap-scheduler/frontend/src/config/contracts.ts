import ScheduledSwapBookABI from "../../abi/ScheduledSwapBook.json";
import BiteSwapV2FactoryABI from "../../abi/BiteSwapV2Factory.json";
import BiteSwapV2RouterABI from "../../abi/BiteSwapV2Router.json";
import BiteSwapV2PairABI from "../../abi/BiteSwapV2Pair.json";
import type { Address } from "viem";
import { useAccount } from "wagmi";

const TARGET_CHAIN_ID = 103698795;

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
  103698795: {
    scheduledSwapBook: '0x6EB7dda20486A5ebfa904Ab310F8e7336cA6D803' as Address,
    limitOrderBook: '0x6EB7dda20486A5ebfa904Ab310F8e7336cA6D803' as Address,
    factory: '0xef84a39A2B0a600Ea91bB6927db519F5834eBF36' as Address,
    router: '0x2db91801b667ED6cAd305c9882f3Bc0d2eDA6B24' as Address,
    pairs: {
      USDC_WETH: '0x983b72fc406AE36906c59a9eF8C695a720E204e9' as Address,
      USDC_WBTC: '0x4f27Ccb25320192aCa416e8ab3587Db5E66E44e6' as Address,
      USDT_WETH: '0x1FC90846f98B4f9C7eE2844aCFe7dFf67E8c31e8' as Address,
      USDT_WBTC: '0xeBA32eCc184d7BcFA5B792C2E6688A2999Cc31BD' as Address,
      WETH_WBTC: '0xE1A53f17bbC434242047FFB4112AcCD6de6D3201' as Address,
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
  limitOrderBook: '' as Address,
  factory: '' as Address,
  router: '' as Address,
  CTX_GAS_COST,
} as const;

export const FACTORY_ADDRESS = '0xef84a39A2B0a600Ea91bB6927db519F5834eBF36' as Address;
export const ROUTER_ADDRESS = '0x2db91801b667ED6cAd305c9882f3Bc0d2eDA6B24' as Address;

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
  const { chain } = useAccount();
  const chainId = chain?.id ?? TARGET_CHAIN_ID;
  const contracts = getContractForChain(chainId);
  if (!contracts) {
    throw new Error(`Contracts not configured for chain ${chainId}`);
  }
  return contracts;
}
