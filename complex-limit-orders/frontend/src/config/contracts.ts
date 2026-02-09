/**
 * @deprecated Import from "@/config" instead
 * This file is kept for backward compatibility
 */

import ConfidentialLimitOrderBookABI from "../../abi/ConfidentialLimitOrderBook.json";
import BiteSwapV2FactoryABI from "../../abi/BiteSwapV2Factory.json";
import BiteSwapV2RouterABI from "../../abi/BiteSwapV2Router.json";
import BiteSwapV2PairABI from "../../abi/BiteSwapV2Pair.json";
import {
  CONTRACTS,
  PRECOMPILES,
  CTX_GAS_COST,
  PAIRS,
  getPoolName,
  getConfig,
  getContractForChain,
  useContracts,
} from "./index";

export {
  CONTRACTS,
  PRECOMPILES,
  CTX_GAS_COST,
  PAIRS,
  getPoolName,
  getConfig,
  useContracts,
  getContractForChain,
} from "./index";

// ABIs
export const CONTRACT_ABIS = {
  limitOrderBook: ConfidentialLimitOrderBookABI,
  factory: BiteSwapV2FactoryABI,
  router: BiteSwapV2RouterABI,
  pair: BiteSwapV2PairABI,
} as const;

// Event signatures
export const EVENT_SIGNATURES = {
  OrderSubmitted: "OrderSubmitted(address,uint256,uint256,bytes,bytes)",
  OrderFilled: "OrderFilled(address,uint256,uint256)",
  OrderCancelled: "OrderCancelled(address,uint256)",
} as const;

// Legacy exports
export const FACTORY_ADDRESS = CONTRACTS.factory;
export const ROUTER_ADDRESS = CONTRACTS.router;
export const CONTRACTS_OLD = {
  precompiles: PRECOMPILES,
  limitOrderBook: CONTRACTS.limitOrderBook,
  factory: CONTRACTS.factory,
  router: CONTRACTS.router,
  CTX_GAS_COST,
} as const;

// Type for backward compatibility
export type ChainContractConfig = ReturnType<typeof getConfig>;
