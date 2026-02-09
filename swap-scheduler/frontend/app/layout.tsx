import type { Metadata } from 'next';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from './providers';
import { SkaleBadge } from '@/components/layout/SkaleBadge';

export const metadata: Metadata = {
  title: 'BiteSwap | Confidential DEX on SKALE',
  description: 'Private decentralized exchange powered by BITE V2 threshold encryption',
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-stone-100">
        <Providers>
          {children}
          <SkaleBadge />
        </Providers>
      </body>
    </html>
  );
}
