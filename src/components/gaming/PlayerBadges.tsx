'use client';

import React from 'react';
import { CheckCircle2, Crown, ShieldCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerBadge } from '@/lib/types/database';

interface PlayerBadgesProps {
  playerBadges?: PlayerBadge[];
  emailConfirmed?: boolean;
  role?: string;
  tournamentsWon?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlayerBadges({
  playerBadges,
  emailConfirmed,
  role,
  tournamentsWon = 0,
  size = 'md',
  className,
}: PlayerBadgesProps) {
  // Aggregate badges from database playerBadges or derive fallback flags
  const badgeMap = new Map<string, { name: string; icon: React.ReactNode; color: string }>();

  if (playerBadges && playerBadges.length > 0) {
    playerBadges.forEach(pb => {
      if (pb.badge) {
        let icon = <Award className="w-3.5 h-3.5" />;
        if (pb.badge_id === 'verified') icon = <CheckCircle2 className="w-3.5 h-3.5" />;
        if (pb.badge_id === 'champion') icon = <Crown className="w-3.5 h-3.5" />;
        if (pb.badge_id === 'organizer') icon = <ShieldCheck className="w-3.5 h-3.5" />;

        badgeMap.set(pb.badge_id, {
          name: pb.badge.name,
          icon,
          color: pb.badge.color || 'emerald',
        });
      }
    });
  }

  // Fallback / derived flags if playerBadges query is empty or not passed
  if (emailConfirmed && !badgeMap.has('verified')) {
    badgeMap.set('verified', {
      name: 'Verified Player',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'emerald',
    });
  }

  if (tournamentsWon > 0 && !badgeMap.has('champion')) {
    badgeMap.set('champion', {
      name: 'Tournament Champion',
      icon: <Crown className="w-3.5 h-3.5" />,
      color: 'amber',
    });
  }

  if (role === 'admin' && !badgeMap.has('organizer')) {
    badgeMap.set('organizer', {
      name: 'Organizer',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: 'purple',
    });
  }

  if (badgeMap.size === 0) return null;

  const colorStyles: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-glow-sm',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {Array.from(badgeMap.entries()).map(([id, b]) => (
        <span
          key={id}
          title={b.name}
          className={cn(
            'inline-flex items-center font-bold rounded-lg border backdrop-blur-sm transition-all',
            colorStyles[b.color] || colorStyles.emerald,
            sizeStyles[size]
          )}
        >
          {b.icon}
          <span>{b.name}</span>
        </span>
      ))}
    </div>
  );
}
