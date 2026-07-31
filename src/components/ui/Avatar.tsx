import React from 'react';
import { cn } from '@/lib/utils';

/* ── Circular Avatar ──────────────────────────────────── */
interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rank?: number;
  verified?: boolean;
  online?: boolean;
  className?: string;
  seed?: string;
}

const sizeMap = {
  xs:  'w-7 h-7 text-xs',
  sm:  'w-9 h-9 text-xs',
  md:  'w-12 h-12 text-sm',
  lg:  'w-16 h-16 text-base',
  xl:  'w-20 h-20 text-lg',
  '2xl': 'w-28 h-28 text-2xl',
};

const ringMap = {
  1: 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]',
  2: 'ring-2 ring-slate-400',
  3: 'ring-2 ring-amber-700',
};

export function Avatar({ src, alt, size = 'md', rank, verified, online, className, seed }: AvatarProps) {
  const imgSrc = src || `https://api.dicebear.com/7.x/bottts/svg?seed=${seed || alt || 'user'}`;
  const ring = rank && rank <= 3 ? ringMap[rank as keyof typeof ringMap] : 'ring-1 ring-white/10';

  return (
    <div className={cn('relative shrink-0 inline-flex', className)}>
      <div className={cn('rounded-full overflow-hidden', sizeMap[size], ring)}>
        <img
          src={imgSrc}
          alt={alt || 'avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${alt || 'U'}`;
          }}
        />
      </div>

      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-secondary-500 border-2 border-gaming-dark flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}

      {online !== undefined && (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gaming-dark',
          online ? 'bg-accent-dim' : 'bg-gray-500'
        )} />
      )}
    </div>
  );
}

/* ── Avatar Group ─────────────────────────────────────── */
interface AvatarGroupProps {
  srcs: (string | null | undefined)[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ srcs, max = 5, size = 'sm' }: AvatarGroupProps) {
  const visible = srcs.slice(0, max);
  const extra = srcs.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((src, i) => (
        <Avatar key={i} src={src} size={size} className="ring-2 ring-gaming-dark" />
      ))}
      {extra > 0 && (
        <div className={cn(
          'rounded-full bg-surface-3 border-2 border-gaming-dark flex items-center justify-center font-bold text-gray-400',
          sizeMap[size]
        )}>
          <span className="text-[10px]">+{extra}</span>
        </div>
      )}
    </div>
  );
}
