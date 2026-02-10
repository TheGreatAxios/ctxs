export function formatAddress(address: `0x${string}`): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBlockNumber(block: bigint): string {
  return `#${block.toString()}`;
}

export function formatTimeRemaining(blocks: bigint): string {
  const seconds = Number(blocks) * 12; // SKALE block time
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
