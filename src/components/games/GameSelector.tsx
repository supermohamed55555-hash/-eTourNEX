'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveGames } from '@/lib/bracket/engine';
import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types/database';

interface GameSelectorProps {
  value: string;
  onChange: (gameId: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function GameSelector({
  value,
  onChange,
  label = 'Select Game Title',
  placeholder = 'Choose a game...',
  error,
  required,
  className,
}: GameSelectorProps) {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['active-games'],
    queryFn: () => fetchActiveGames(),
  });

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && (
        <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-primary-400" />
          {label} {required && '*'}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isLoading}
          required={required}
          className={cn(
            'input w-full appearance-none pr-10',
            error && 'border-danger'
          )}
        >
          <option value="" className="bg-surface-2">{placeholder}</option>
          {games.map((g: Game) => (
            <option key={g.id} value={g.id} className="bg-surface-2">
              {g.icon_url || '🎮'} {g.name} ({g.category || 'Esports'})
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs">
          ▼
        </div>
      </div>

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
