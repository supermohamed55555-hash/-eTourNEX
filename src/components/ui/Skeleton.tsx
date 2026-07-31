import React from 'react';
import { cn } from '@/lib/utils';

/* ── Skeleton Base ────────────────────────────────────── */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton rounded-lg', className)}
      {...props}
    />
  );
}

/* ── Card Skeleton ────────────────────────────────────── */
export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-4/5" />
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  );
}

/* ── Tournament Card Skeleton ─────────────────────────── */
export function TournamentCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Skeleton className="h-40 rounded-none rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

/* ── Player Card Skeleton ─────────────────────────────── */
export function PlayerCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <div className="space-y-2 w-full text-center">
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-3 w-1/3 mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-white/10">
        <div className="space-y-1">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Table Row Skeletons ──────────────────────────────── */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={cn('h-4', i === 0 ? 'w-8' : i === 1 ? 'w-32' : 'w-16')} />
        </td>
      ))}
    </tr>
  );
}

/* ── Stat Row Skeleton ────────────────────────────────── */
export function StatSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-2.5 w-1/4" />
    </div>
  );
}
