'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchTournaments } from '@/lib/bracket/engine';
import { fetchAllGames } from '@/lib/actions/game-actions';
import TournamentCard from '@/components/gaming/TournamentCard';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton, TournamentCardSkeleton } from '@/components/ui/Skeleton';
import { Search, SlidersHorizontal, Gamepad2, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types/database';
import { GameFilter } from '@/components/games/GameFilter';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Categories', icon: Gamepad2 },
  { id: 'Sports', label: 'Sports', icon: Trophy },
  { id: 'Fighting', label: 'Fighting', icon: Sparkles },
  { id: 'Battle Royale', label: 'Battle Royale', icon: Sparkles },
  { id: 'FPS', label: 'FPS', icon: Sparkles },
  { id: 'MOBA', label: 'MOBA', icon: Sparkles },
];

export default function TournamentsPage() {
  const { data: allTournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: dbGames = [] } = useQuery({
    queryKey: ['games-all'],
    queryFn: () => fetchAllGames(),
  });

  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameFilter, setGameFilter]     = useState('all');
  const [sortBy, setSortBy]             = useState('newest');

  // Filter games based on selected category
  const availableGames = categoryFilter === 'all'
    ? dbGames
    : dbGames.filter((g: Game) => g.category === categoryFilter);

  const filtered = allTournaments.filter(t => {
    const matchesSearch   = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus   = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.game?.category === categoryFilter;
    const matchesGame     = gameFilter === 'all' || t.game_id === gameFilter || t.game?.name === gameFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesGame;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.starts_at ?? b.created_at).getTime() - new Date(a.starts_at ?? a.created_at).getTime();
    if (sortBy === 'prize') return (Number(b.prize_pool) || 0) - (Number(a.prize_pool) || 0);
    if (sortBy === 'participants') return (b.participants_count ?? 0) - (a.participants_count ?? 0);
    return 0;
  });

  // Normalize for TournamentCard
  const normalize = (t: typeof allTournaments[0]) => ({
    ...t,
    title: t.name,
    start_date: t.starts_at ?? t.created_at,
    max_participants: t.max_players ?? 32,
    current_participants: t.participants_count ?? 0,
    prize_pool: Number(t.prize_pool) || 0,
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 sm:p-12 border border-white/10">
        <div className="absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-bold">
            <Gamepad2 className="w-3.5 h-3.5" /> MULTI-GAME ESPORTS PLATFORM
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Esports <span className="brand-text">Tournaments</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Browse multi-title esports competitions across Sports, Fighting, Battle Royale, FPS, and MOBA games.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setCategoryFilter(tab.id);
              setGameFilter('all');
            }}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border',
              categoryFilter === tab.id
                ? 'bg-primary-600/30 border-primary-500/50 text-white shadow-purple-glow-sm'
                : 'glass text-gray-400 hover:text-white border-white/5 hover:border-white/15'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Game Filter Pills */}
      <GameFilter
        selectedGameId={gameFilter}
        onSelectGame={setGameFilter}
      />

      {/* Controls */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search tournament name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'registration', label: 'Open Registration' },
              { value: 'in_progress', label: 'Live Now' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <Select
            value={gameFilter}
            onChange={e => setGameFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Game Titles' },
              ...availableGames.map((g: Game) => ({ value: g.id, label: `${g.name} (${g.category})` })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            options={[
              { value: 'newest', label: 'Sort: Start Date' },
              { value: 'prize', label: 'Sort: Prize Pool' },
              { value: 'participants', label: 'Sort: Participants' },
            ]}
          />
        </div>
      </div>

      {/* Grid */}
      {loadingT ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <TournamentCardSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t, index) => (
            <TournamentCard key={t.id} tournament={normalize(t) as any} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-3xl border border-white/10 space-y-4">
          <SlidersHorizontal className="w-10 h-10 mx-auto text-gray-600" />
          <h3 className="text-xl font-bold text-white">No Tournaments Found</h3>
          <p className="text-gray-400 text-sm">
            No tournaments found for category &ldquo;{categoryFilter}&rdquo;. Try resetting filters.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
              setStatusFilter('all');
              setGameFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
