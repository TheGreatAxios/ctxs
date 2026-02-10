import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import type { FlightInfo, Passenger } from '../types';
import ROCKET_ABI from '../abi/Rocket.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_ROCKET_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

export function useContract() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<bigint>(0n);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, ROCKET_ABI, signer);

      setProvider(provider);
      setContract(contract);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, []);

  const boardRocket = useCallback(async (amount: string, ejectMultiplier: number) => {
    if (!contract || !account) return;

    try {
      const amountWei = ethers.parseEther(amount);
      const multiplier = BigInt(Math.floor(ejectMultiplier * 100));
      
      const tx = await contract.boardRocket(multiplier, { value: amountWei });
      await tx.wait();
    } catch (error) {
      console.error('Boarding error:', error);
      throw error;
    }
  }, [contract, account]);

  const withdraw = useCallback(async () => {
    if (!contract) return;

    try {
      const tx = await contract.withdraw();
      await tx.wait();
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw error;
    }
  }, [contract]);

  const refreshData = useCallback(async () => {
    if (!contract) return;

    try {
      const info = await contract.getCurrentFlightInfo();
      setFlightInfo({
        flightNumber: info.flightNumber,
        boardingStartTime: info.boardingStartTime,
        launchTime: info.launchTime,
        secondsRemaining: info.secondsRemaining,
        totalPot: info.totalPot,
        passengerCount: info.passengerCount,
        isBettingOpen: info.isBettingOpen,
        hasPassengers: info.hasPassengers,
      });

      const flightPassengers = await contract.getFlightPassengers(info.flightNumber);
      setPassengers(flightPassengers);

      if (account) {
        const pending = await contract.pendingWithdrawals(account);
        setPendingWithdrawal(pending);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [contract, account]);

  useEffect(() => {
    if (contract) {
      refreshData();
      const interval = setInterval(refreshData, 250);
      return () => clearInterval(interval);
    }
  }, [contract, refreshData]);

  return {
    account,
    contract,
    flightInfo,
    passengers,
    pendingWithdrawal,
    connect,
    boardRocket,
    withdraw,
    refreshData,
  };
}