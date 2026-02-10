import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NOSTRADAMUS_REGISTRY_ABI } from './abis/NostradamusRegistry';
import { SubmissionForm } from './components/prediction/SubmissionForm';
import { PredictionCard } from './components/prediction/PredictionCard';
import './components/prediction/Prediction.css';
import { CONTRACTS } from './config/contracts';

const CONTRACT_ADDRESS = CONTRACTS.nostradamusRegistry;

function App() {
  const { isConnected, chain } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data: totalPredictions } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: NOSTRADAMUS_REGISTRY_ABI,
    functionName: 'getTotalPredictions',
    query: {
      refetchInterval: 5000,
    },
  });

  const total = totalPredictions ? Number(totalPredictions) : 0;
  const predictionIds = Array.from({ length: total }, (_, i) => BigInt(i + 1));

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🔮 Nostradamus Registry</h1>
          <p>Encrypted Time Capsule Predictions on SKALE</p>
        </div>
        <ConnectButton />
      </header>

      <main className="app-main">
        {isConnected && chain?.id === 103698795 ? (
          <>
            <section className="form-section">
              <SubmissionForm
                contractAddress={CONTRACT_ADDRESS}
              />
            </section>

            <section className="registry-section">
              <div className="section-header">
                <h2>Predictions Registry</h2>
                {blockNumber && (
                  <span className="block-info">Block: {blockNumber.toString()}</span>
                )}
              </div>

              {total === 0 ? (
                <div className="empty-state">
                  No predictions yet. Submit one above!
                </div>
              ) : (
                <div className="predictions-list">
                  {predictionIds.map(id => (
                    <PredictionCard
                      key={id.toString()}
                      predictionId={id}
                      contractAddress={CONTRACT_ADDRESS}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="connect-prompt-large">
            {isConnected ? (
              <p>Please switch to SKALE Testnet</p>
            ) : (
              <p>Connect your wallet to get started</p>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by BITE V2 • SKALE Blockchain</p>
      </footer>
    </div>
  );
}

export default App;
