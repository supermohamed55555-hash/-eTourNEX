import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-purple-glow-sm hover:shadow-purple-glow hover:scale-[1.02] active:scale-[0.98]',
        secondary: 'bg-surface-2 border border-white/10 text-gray-200 hover:bg-surface-3 hover:border-white/20 hover:text-white active:scale-[0.98]',
        ghost: 'glass text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-[0.98]',
        neon: 'border border-accent-neon/40 text-accent-neon bg-accent-neon/5 hover:bg-accent-neon/10 hover:border-accent-neon hover:shadow-neon active:scale-[0.98]',
        danger: 'bg-danger text-white hover:bg-red-500 active:scale-[0.98]',
        outline: 'border border-primary-500/50 text-primary-400 hover:bg-primary-500/10 hover:border-primary-400 active:scale-[0.98]',
      },
      size: {
        sm:  'text-xs px-3.5 py-2 rounded-lg',
        md:  'text-sm px-5 py-2.5',
        lg:  'text-sm px-7 py-3.5 rounded-2xl',
        xl:  'text-base px-10 py-4 rounded-2xl',
        icon:'h-9 w-9 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, iconRight, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
