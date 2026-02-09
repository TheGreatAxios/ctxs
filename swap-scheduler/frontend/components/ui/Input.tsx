import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, rightElement, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles
              'flex h-11 w-full px-4 text-base font-medium text-foreground',
              // Neo-brutalist border and shadow
              'border-3 border-solid border-border bg-background',
              'rounded-md transition-all',
              // Focus styles
              'focus:outline-none focus:border-primary',
              // Placeholder
              'placeholder:text-muted-foreground/70',
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Error state
              error && 'border-error focus:border-error',
              // Right element padding
              rightElement && 'pr-12',
              // Custom shadow for brutalist effect
              'shadow-brutalist',
              className
            )}
            style={{
              boxShadow: error
                ? '4px 4px 0px 0px hsl(var(--error))'
                : '4px 4px 0px 0px hsl(var(--border))',
            }}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-error" />
            <p className="text-xs font-bold uppercase tracking-wide text-error">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
