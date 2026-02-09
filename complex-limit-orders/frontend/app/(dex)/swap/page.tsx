'use client';

import { SwapForm } from '@/components/dex/SwapForm';
import { getContractForChain } from '@/config/contracts';
import { AVAILABLE_TOKENS } from '@/config/tokens';
import { useAccount } from 'wagmi';
import { TokenBalancesProvider } from '@/context/TokenBalancesContext';

export default function SwapPage() {
  const { chain } = useAccount();

  // Get factory and router addresses for current chain
  const contracts = chain ? getContractForChain(chain.id) : null;
  const factoryAddress = contracts?.factory;
  const routerAddress = contracts?.router;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <TokenBalancesProvider tokens={AVAILABLE_TOKENS}>
          <SwapForm
            factoryAddress={factoryAddress}
            routerAddress={routerAddress}
            availableTokens={AVAILABLE_TOKENS}
          />
        </TokenBalancesProvider>

        {/* BITE Explanation */}
        <div className="mt-6 bg-stone-100 border-2 border-black rounded-xl p-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">
            What is BITE?
          </h3>
          <p className="text-xs font-semibold text-stone-600 leading-relaxed">
            BITE (Blockchain Integrated Threshold Encryption) enables conditional transactions that execute in future blocks with encrypted data. Your transaction details are encrypted using threshold encryption, executed in the next block, and revealed only when necessary.
          </p>
        </div>
      </div>
    </div>
  );
}
