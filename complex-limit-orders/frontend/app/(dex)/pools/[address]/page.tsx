import { PoolDetail } from '@/components/dex/PoolDetail';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    address: string;
  }>;
}

export default async function PoolDetailPage({ params }: PageProps) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    notFound();
  }

  return <PoolDetail pairAddress={address as `0x${string}`} />;
}
