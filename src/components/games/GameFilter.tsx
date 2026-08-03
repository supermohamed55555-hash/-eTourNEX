'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveGames } from '@/lib/bracket/engine';
import { Gamepad2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types/database';

interface GameFilterProps {
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
  className?: string;
  showAll?: boolean;
}

export function GameFilter({
  selectedGameId,
  onSelectGame,
  className,
  showAll = true,
}: GameFilterProps) {
  const { data: games = [] } = useQuery({
    queryKey: ['active-games'],
    queryFn: () => fetchActiveGames(),
  });

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none', className)}>
      {showAll && (
        <button
          onClick={() => onSelectGame('all')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border',
            selectedGameId === 'all'
              ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white border-primary-400 shadow-purple-glow-sm scale-[1.02]'
              : 'glass text-gray-400 hover:text-white border-white/10 hover:border-white/20'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          All Games
        </button>
      )}

      {games.map((g: Game) => {
        const isSelected = selectedGameId === g.id || selectedGameId === g.slug;
        return (
          <button
            key={g.id}
            onClick={() => onSelectGame(g.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border',
              isSelected
                ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white border-primary-400 shadow-purple-glow-sm scale-[1.02]'
                : 'glass text-gray-400 hover:text-white border-white/10 hover:border-white/20'
            )}
            style={isSelected && g.color ? { borderColor: g.color } : {}}
          >
            <span className="text-sm">{g.icon_url || '🎮'}</span>
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
