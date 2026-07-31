'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Trophy, Users, Calendar, DollarSign, Clock, ChevronRight, Gamepad2 } from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  game?: { name: string };
  game_name?: string;
  status: 'registration' | 'in_progress' | 'completed' | 'cancelled';
  prize_pool: number;
  max_participants: number;
  current_participants: number;
  start_date: string;
  banner_url?: string | null;
  format?: string;
}

interface TournamentCardProps {
  tournament: Tournament;
  index?: number;
  compact?: boolean;
}

const FALLBACK_BANNERS = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80',
];

const STATUS_CONFIG = {
  registration:  { label: 'Open',        class: 'badge-registration', dot: true },
  in_progress:   { label: 'Live',         class: 'badge-in-progress',  dot: true },
  completed:     { label: 'Ended',        class: 'badge-completed',    dot: false },
  cancelled:     { label: 'Cancelled',    class: 'badge-cancelled',    dot: false },
};

export default function TournamentCard({ tournament: t, index = 0, compact = false }: TournamentCardProps) {
  const fillPct = Math.min(100, Math.round((t.current_participants / t.max_participants) * 100));
  const isFull  = t.current_participants >= t.max_participants;
  const banner  = t.banner_url || FALLBACK_BANNERS[index % FALLBACK_BANNERS.length];
  const status  = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.completed;
  const gameName = t.game?.name ?? t.game_name ?? 'Tournament';

  const fakeParticipants = Array.from({ length: Math.min(5, t.current_participants) }, (_, i) =>
    `https://api.dicebear.com/7.x/bottts/svg?seed=player${t.id}${i}`
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group glass-card rounded-2xl overflow-hidden card-hover flex flex-col h-full"
    >
      {/* Banner */}
      <div className="relative overflow-hidden" style={{ aspectRatio: compact ? '16/7' : '16/8' }}>
        <img
          src={banner}
          alt={t.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/30 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={cn('badge', status.class)}>
            {status.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {t.status === 'in_progress' ? '🔴 LIVE' : status.label}
          </span>
        </div>

        {/* Prize pool */}
        {t.prize_pool > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-amber-500/30">
            <DollarSign className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">
              {t.prize_pool >= 1000 ? `$${(t.prize_pool / 1000).toFixed(0)}K` : `$${t.prize_pool}`}
            </span>
          </div>
        )}

        {/* Game chip */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
          <Gamepad2 className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-300">{gameName}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
            {t.title}
          </h3>
          {t.format && (
            <span className="text-[11px] text-gray-500 mt-0.5 block">{t.format}</span>
          )}
        </div>

        {/* Participants progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <AvatarGroup srcs={fakeParticipants} size="xs" />
              <span className="text-gray-400">
                <span className={cn('font-bold', isFull ? 'text-danger' : 'text-white')}>{t.current_participants}</span>
                /{t.max_participants}
              </span>
            </div>
            {isFull ? (
              <span className="text-[10px] font-bold text-danger uppercase">FULL</span>
            ) : (
              <span className="text-[10px] text-gray-500">{fillPct}%</span>
            )}
          </div>
          <div className="progress-bar">
            <div
              className={cn('progress-fill transition-all duration-700', isFull && 'from-danger to-red-400')}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Date row */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{new Date(t.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          <Link
            href={`/tournaments/${t.id}`}
            className={cn(
              'flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200',
              t.status === 'registration'
                ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:shadow-purple-glow-sm hover:scale-[1.02]'
                : 'glass border border-white/10 text-gray-300 hover:text-white hover:border-white/20'
            )}
          >
            {t.status === 'registration' ? (
              <>Join Now <ChevronRight className="w-3.5 h-3.5" /></>
            ) : t.status === 'in_progress' ? (
              <>Watch Live <ChevronRight className="w-3.5 h-3.5" /></>
            ) : (
              <>View Results <ChevronRight className="w-3.5 h-3.5" /></>
            )}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
