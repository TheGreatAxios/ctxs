import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const buttonVariants = {
  primary: 'bg-primary text-primary-foreground border-border hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/90',
  accent: 'bg-accent text-accent-foreground border-border hover:bg-accent/90',
  outline: 'bg-transparent text-foreground border-border hover:bg-muted hover:border-foreground',
  ghost: 'bg-transparent text-foreground border-transparent hover:bg-muted',
  error: 'bg-error text-error-foreground border-border hover:bg-error/90',
};

const buttonSizes = {
  sm: 'h-9 px-4 text-sm font-bold',
  md: 'h-11 px-6 text-base font-bold',
  lg: 'h-13 px-8 text-lg font-extrabold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all cursor-pointer',
          // Neo-brutalist border and shadow
          'border-3 border-solid',
          'brutalist-shadow',
          // Focus styles
          'focus-visible:outline-none focus-visible:box-shadow-focus',
          // Disabled styles
          'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:brutalist-disabled',
          // Variant and size
          buttonVariants[variant],
          buttonSizes[size],
          // Rounded corners with brutalist feel
          'rounded-md',
          className
        )}
        style={{
          boxShadow: disabled || isLoading ? 'none' : '4px 4px 0px 0px hsl(var(--border))',
        }}
        {...props}
      >
        {isLoading && (
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            role="status"
            aria-label="Loading"
          >
            <span className="sr-only">Loading...</span>
          </div>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
