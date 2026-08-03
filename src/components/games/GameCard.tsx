'use client';

import React from 'react';
import Link from 'next/link';
import { Gamepad2, ChevronRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types/database';

interface GameCardProps {
  game: Game;
  tournamentCount?: number;
}

export function GameCard({ game, tournamentCount = 0 }: GameCardProps) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group glass-card rounded-2xl overflow-hidden hover:border-primary-500/40 hover:shadow-purple-glow-sm transition-all duration-300 block relative"
    >
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-primary-900/60 to-secondary-900/60 overflow-hidden">
        {game.banner_url ? (
          <img
            src={game.banner_url}
            alt={game.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-40 bg-gradient-to-br"
            style={{ backgroundColor: game.color || '#8B5CF6' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151522] via-transparent to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-black/60 backdrop-blur-md text-white border border-white/20">
            {game.category || 'Esports'}
          </span>
        </div>
      </div>

      <div className="p-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center text-2xl shadow-lg shrink-0"
              style={game.color ? { borderColor: `${game.color}40` } : {}}
            >
              {game.icon_url || '🎮'}
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-primary-300 transition-colors">
                {game.name}
              </h3>
              {game.publisher && (
                <p className="text-xs text-gray-500">{game.publisher}</p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 font-semibold text-primary-400">
            <Trophy className="w-3.5 h-3.5 text-accent-amber" />
            {tournamentCount} Tournament{tournamentCount !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-gray-500 font-mono">View Game →</span>
        </div>
      </div>
    </Link>
  );
}
