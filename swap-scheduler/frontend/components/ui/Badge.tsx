import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border-2 border-solid px-3 py-1 text-xs font-extrabold uppercase tracking-wider transition-all',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border shadow-brutalist',
        pending: 'bg-warning text-warning-foreground border-warning shadow-brutalist',
        open: 'bg-info text-info-foreground border-info shadow-brutalist',
        filled: 'bg-success text-success-foreground border-success shadow-brutalist',
        cancelled: 'bg-error text-error-foreground border-error shadow-brutalist',
        expired: 'bg-muted text-muted-foreground border-border shadow-brutallest',
        primary: 'bg-primary text-primary-foreground border-primary shadow-brutallest',
        secondary: 'bg-secondary text-secondary-foreground border-secondary shadow-brutallest',
        accent: 'bg-accent text-accent-foreground border-accent shadow-brutallest',
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
    <div
      className={cn(
        badgeVariants({ variant }),
        'rounded-md',
        className
      )}
      style={{
        boxShadow: '2px 2px 0px 0px currentColor',
      }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
