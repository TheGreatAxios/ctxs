export interface Passenger {
  player: string;
  betAmount: bigint;
  ejectMultiplier: bigint;
  hasEjected: boolean;
  hasClaimed: boolean;
}

export interface FlightInfo {
  flightNumber: bigint;
  boardingStartTime: bigint;
  launchTime: bigint;
  secondsRemaining: bigint;
  totalPot: bigint;
  passengerCount: bigint;
  isBettingOpen: boolean;
  hasPassengers: boolean;
}

export interface GameState {
  currentMultiplier: number;
  targetMultiplier: number | null;
  phase: 'waiting' | 'boarding' | 'launching' | 'flying' | 'crashed' | 'resolved';
  flightNumber: bigint;
  lastCrashPoint: number | null;
}

export type AgentAvatar = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

export const AGENT_AVATARS: AgentAvatar[] = [
  { id: '1', name: 'Agent_007', color: '#FF6B6B', emoji: '🕵️' },
  { id: '2', name: 'Degenerate_Bot', color: '#4ECDC4', emoji: '🤖' },
  { id: '3', name: 'Moonshot_Max', color: '#45B7D1', emoji: '🚀' },
  { id: '4', name: 'Safe_Bet_Sam', color: '#96CEB4', emoji: '🛡️' },
  { id: '5', name: 'Yolo_Yuki', color: '#FFEAA7', emoji: '🔥' },
  { id: '6', name: 'Diamond_Hands', color: '#DDA0DD', emoji: '💎' },
  { id: '7', name: 'Paper_Hands', color: '#98D8C8', emoji: '🧻' },
  { id: '8', name: 'FOMO_Fred', color: '#F7DC6F', emoji: '😱' },
  { id: '9', name: 'HODL_Harriet', color: '#BB8FCE', emoji: '💪' },
  { id: '10', name: 'Rekt_Randy', color: '#85C1E2', emoji: '💀' },
];