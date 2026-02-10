import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import type { Passenger } from '../types';
import ROCKET_ABI from '../abi/Rocket.json';

const CONTRACT_ADDRESS = '0x35dad6336147F274Daa3981e8fb0CA37bf85BDbA';

interface FlightInfo {
  flightNumber: bigint;
  launchTime: bigint;
  secondsRemaining: bigint;
  totalPot: bigint;
  passengerCount: bigint;
  isBettingOpen: boolean;
  hasCommitment: boolean;
  saltRevealed: boolean;
  isFlying: boolean;
  isCrashed: boolean;
  currentMultiplier: bigint;
  crashPoint: bigint;
}

export function useContract() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<bigint>(0n);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      let network = await provider.getNetwork();

      // Check if on correct SKALE chain (chainId: 103698795)
      if (Number(network.chainId) !== 103698795) {
        setError('Adding SKALE chain...');
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x63007eb',
              chainName: 'SKALE Testnet',
              nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
              rpcUrls: ['https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox'],
              blockExplorerUrls: ['https://base-sepolia-testnet-explorer.skalenodes.com:10012/'],
            }],
          });
        } catch (addError: any) {
          // Chain might already exist, ignore and try switching
        }
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x63007eb' }],
        });
        network = await provider.getNetwork();
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, ROCKET_ABI, signer);

      setProvider(provider);
      setContract(contract);
      setAccount(accounts[0]);
      setError(null);
    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    }
  }, []);

  const boardRocket = useCallback(async (amount: string, ejectMultiplier: number) => {
    if (!contract || !account) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      const amountWei = ethers.parseEther(amount);
      const multiplier = BigInt(Math.floor(ejectMultiplier * 100));

      const tx = await contract.boardRocket(multiplier, { value: amountWei });
      await tx.wait();
      await refreshData();
    } catch (error: any) {
      console.error('Boarding error:', error);
      setError(error.message || 'Failed to board rocket');
      throw error;
    }
  }, [contract, account]);

  const jumpOff = useCallback(async (flightNum: number) => {
    if (!contract) {
      setError('Contract not connected');
      return;
    }

    try {
      setError(null);
      const tx = await contract.jumpOff(flightNum);
      await tx.wait();
      await refreshData();
    } catch (error: any) {
      console.error('Jump off error:', error);
      setError(error.message || 'Failed to jump off');
      throw error;
    }
  }, [contract]);

  const withdraw = useCallback(async () => {
    if (!contract) return;

    try {
      setError(null);
      const tx = await contract.withdraw();
      await tx.wait();
      await refreshData();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setError(error.message || 'Failed to withdraw');
      throw error;
    }
  }, [contract]);

  const refreshData = useCallback(async () => {
    if (!contract) return;

    try {
      const currentFlight = await contract.currentFlight();

      // Get all flight info from split functions
      const [hasCommitment, saltRevealed, isFlying, isCrashed, hasPassengers] = await contract.getFlightState(currentFlight);
      const [launchTime, secondsRemaining, totalPot, passengerCount, isBettingOpen] = await contract.getFlightInfo(currentFlight);
      const [currentMultiplier, crashPoint] = await contract.getFlightMultiplier(currentFlight);

      setFlightInfo({
        flightNumber: currentFlight,
        launchTime,
        secondsRemaining,
        totalPot,
        passengerCount,
        isBettingOpen,
        hasCommitment,
        saltRevealed,
        isFlying,
        isCrashed,
        currentMultiplier,
        crashPoint,
      });

      const flightPassengers = await contract.getFlightPassengers(currentFlight);
      setPassengers(flightPassengers);

      if (account) {
        const pending = await contract.pendingWithdrawals(account);
        setPendingWithdrawal(pending);
      }
    } catch (error: any) {
      console.error('Refresh error:', error);
    }
  }, [contract, account]);

  useEffect(() => {
    if (contract) {
      refreshData();
      const interval = setInterval(refreshData, 500);
      return () => clearInterval(interval);
    }
  }, [contract, refreshData]);

  return {
    account,
    contract,
    flightInfo,
    passengers,
    pendingWithdrawal,
    error,
    connect,
    boardRocket,
    jumpOff,
    withdraw,
    refreshData,
  };
}
