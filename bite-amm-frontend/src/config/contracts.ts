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
    limitOrderBook: '0x5552f3e652dB7479f9a9F7dC94fC209c6F1660Bb' as Address,
    factory: '0x40D2A813fCBE548CF2636748e7B2e39FEfBd2cF9' as Address,
    router: '0xF78dFed4F1cf58Dc38D1ceD6a64CD67E209E1d34' as Address,
    pairs: {
      USDC_WETH: '0x4bF9696193bCd1D01BDA562bC4390e8EE10F3DEf' as Address,
      USDC_WBTC: '0xDdB841dE31f53302cfa5c0Da4348F135d3513819' as Address,
      USDT_WETH: '0x3B7fB82a99573FE3464f49FcAD91CB8A90c38B33' as Address,
      USDT_WBTC: '0x9418e0c8276455BE252B39CDD8645F123cCFdFe5' as Address,
      WETH_WBTC: '0xDFCc75c7Ca625a3595D31Fa2A57D2d674e869042' as Address,
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
