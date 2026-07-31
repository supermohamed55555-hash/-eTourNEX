import React from 'react';
import { cn } from '@/lib/utils';

/* ── Base Glass Card ──────────────────────────────────── */
export function Card({ className, children, hover = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl',
        hover && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Card Header ──────────────────────────────────────── */
export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 pb-0 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Card Title ───────────────────────────────────────── */
export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-bold text-white tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

/* ── Card Content ─────────────────────────────────────── */
export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Card Footer ──────────────────────────────────────── */
export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 pb-5 pt-0 border-t border-white/10 mt-auto', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Surface Card (opaque) ────────────────────────────── */
export function SurfaceCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface rounded-2xl', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Neon Card ────────────────────────────────────────── */
export function NeonCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('neon-card rounded-2xl', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  className?: string;
}

export function StatCard({ label, value, change, positive = true, icon, iconBg = 'bg-primary-500/20', className }: StatCardProps) {
  return (
    <Card className={cn('p-5 space-y-3 card-hover', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {icon && (
          <div className={cn('p-2 rounded-xl', iconBg)}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white font-mono tracking-tight">{value}</p>
        {change && (
          <p className={cn('text-xs font-semibold mt-1', positive ? 'text-accent-dim' : 'text-danger')}>
            {positive ? '▲' : '▼'} {change} vs last month
          </p>
        )}
      </div>
    </Card>
  );
}
