'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { shortenAddress } from '@/lib/utils';
import { TrendingUp, Droplets, FileText } from 'lucide-react';

const navLinks = [
  { href: '/swap', label: 'Swap', icon: TrendingUp },
  { href: '/pools', label: 'Pools', icon: Droplets },
  { href: '/orders', label: 'Orders', icon: FileText },
];

export function Navbar() {
  const { address, isConnected } = useAccount();

  return (
    <nav className="border-b-3 border-black bg-stone-50/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-14 w-14 rounded-xl bg-primary border-2 border-black brutalist-shadow flex items-center justify-center overflow-hidden transition-all group-hover:translate-y-0.5 group-hover:shadow-[3px_3px_0_0_#000]">
              <img src="/logo.svg" alt="BiteSwap" className="h-12 w-12" />
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tight uppercase">
              BiteSwap
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 hover:bg-stone-200 border-2 border-transparent hover:border-black transition-all"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center gap-3">
              {isConnected && address && (
                <div className="hidden sm:block px-3 py-1.5 bg-stone-100 border-2 border-black rounded-xl text-sm font-mono font-bold text-stone-700">
                  {shortenAddress(address)}
                </div>
              )}
              <div className="brutalist-shadow-sm">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2 pb-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 hover:bg-stone-200 border-2 border-transparent hover:border-black transition-all"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
