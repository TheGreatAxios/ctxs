import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-700 text-gray-100',
        pending: 'bg-yellow-900/50 text-yellow-200 border border-yellow-700/50',
        open: 'bg-blue-900/50 text-blue-200 border border-blue-700/50',
        filled: 'bg-green-900/50 text-green-200 border border-green-700/50',
        cancelled: 'bg-red-900/50 text-red-200 border border-red-700/50',
        expired: 'bg-gray-800/50 text-gray-300 border border-gray-700/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
