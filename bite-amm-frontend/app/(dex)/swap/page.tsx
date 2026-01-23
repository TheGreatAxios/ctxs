'use client';

import { SwapForm } from '@/components/dex/SwapForm';
import { getContractForChain } from '@/config/contracts';
import { AVAILABLE_TOKENS } from '@/config/tokens';
import { useAccount } from 'wagmi';

export default function SwapPage() {
  const { chain } = useAccount();

  // Get factory address for current chain
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            BITE-AMM Swap
          </h1>
          <p className="text-muted-foreground">
            Confidential token exchange powered by threshold encryption
          </p>
        </div>
        <SwapForm
          factoryAddress={factoryAddress}
          availableTokens={AVAILABLE_TOKENS}
        />
      </div>
    </div>
  );
}
