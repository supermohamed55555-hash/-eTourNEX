'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveGames } from '@/lib/bracket/engine';
import { GameCard } from '@/components/games/GameCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gamepad2, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types/database';

const CATEGORIES = ['All', 'Sports', 'FPS', 'Battle Royale', 'Fighting', 'MOBA'];

export default function GamesDirectoryPage() {
  const [category, setCategory] = useState('All');
  const [search, setSearch]     = useState('');

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['active-games'],
    queryFn: () => fetchActiveGames(),
  });

  const filteredGames = games.filter((g: Game) => {
    const matchesCategory = category === 'All' || g.category?.toLowerCase() === category.toLowerCase();
    const matchesSearch   = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.publisher?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-bold">
          <Gamepad2 className="w-4 h-4 text-primary-400" /> MULTI-GAME SUPPORT
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">
          Supported <span className="brand-text">Esports Titles</span>
        </h1>
        <p className="text-gray-400 text-sm">
          Browse tournaments, rankings, and stats across all official esports games on eTourNEX.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                category === cat
                  ? 'bg-primary-600 text-white shadow-purple-glow-sm scale-[1.02]'
                  : 'glass text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl space-y-3">
          <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-gray-400">No games found</h3>
          <p className="text-gray-600 text-xs">Try adjusting your category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game: Game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
