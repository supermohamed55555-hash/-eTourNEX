import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
  {
    variants: {
      variant: {
        registration: 'bg-secondary-600/20 text-secondary-400 border border-secondary-500/30',
        'in-progress': 'bg-accent-neon/10 text-accent-neon border border-accent-neon/30',
        completed:    'bg-white/5 text-gray-400 border border-white/15',
        cancelled:    'bg-danger/10 text-danger border border-danger/30',
        admin:        'bg-purple-900/40 text-purple-300 border border-purple-500/30',
        player:       'bg-secondary-900/40 text-secondary-400 border border-secondary-500/30',
        verified:     'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30',
        live:         'bg-red-900/50 text-red-400 border border-red-500/40 animate-pulse',
        featured:     'bg-primary-600/30 text-primary-300 border border-primary-500/40',
        full:         'bg-white/5 text-gray-500 border border-white/10',
        gold:         'bg-amber-900/40 text-amber-400 border border-amber-500/30',
        new:          'bg-accent-neon/15 text-accent-neon border border-accent-neon/40',
      },
    },
    defaultVariants: {
      variant: 'player',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          variant === 'in-progress' && 'bg-accent-neon',
          variant === 'registration' && 'bg-secondary-400',
          variant === 'live' && 'bg-red-400',
          variant === 'completed' && 'bg-gray-500',
        )} />
      )}
      {children}
    </span>
  );
}

/* ── Rank Badge ──────────────────────────────────────── */
export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  const colors = {
    1: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]',
    2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-black',
    3: 'bg-gradient-to-br from-amber-600 to-amber-900 text-white',
  };
  const style = colors[rank as keyof typeof colors] ?? 'bg-surface-3 text-gray-400';

  return (
    <span className={cn(
      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0',
      style, className
    )}>
      {rank}
    </span>
  );
}
