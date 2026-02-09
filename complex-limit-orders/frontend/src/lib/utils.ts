import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBigInt(value: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  return trimmedFractional.length > 0
    ? `${integerPart}.${trimmedFractional}`
    : integerPart.toString();
}

export function parseBigInt(value: string, decimals: number = 18): bigint {
  // Handle empty or invalid input
  if (!value || value.trim() === '' || value === '-' || value === '.') {
    return 0n;
  }

  // Remove invalid characters (anything not digit or dot)
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0n;

  const [integerStr = '0', fractionalStr = ''] = cleaned.split('.');
  const integer = BigInt(integerStr);
  const fractional = BigInt(
    (fractionalStr || '').padEnd(decimals, '0').slice(0, decimals)
  );
  const divisor = BigInt(10 ** decimals);

  return integer * divisor + fractional;
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
