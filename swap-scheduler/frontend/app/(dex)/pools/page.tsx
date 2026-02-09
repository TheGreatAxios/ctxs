import { PoolList } from '@/components/dex/PoolList';

export default function PoolsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Liquidity Pools
        </h1>
        <p className="text-muted-foreground">
          Create and manage confidential liquidity pools
        </p>
      </div>
      <PoolList />
    </div>
  );
}
