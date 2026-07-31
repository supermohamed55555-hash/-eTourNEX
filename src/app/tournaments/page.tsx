'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchTournaments } from '@/lib/bracket/engine';
import TournamentCard from '@/components/gaming/TournamentCard';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton, TournamentCardSkeleton } from '@/components/ui/Skeleton';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function TournamentsPage() {
  const { data: allTournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const games = Array.from(new Set(allTournaments.map(t => t.game?.name ?? 'Unknown')));

  const filtered = allTournaments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesGame = gameFilter === 'all' || t.game?.name === gameFilter;
    return matchesSearch && matchesStatus && matchesGame;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.starts_at ?? b.created_at).getTime() - new Date(a.starts_at ?? a.created_at).getTime();
    if (sortBy === 'prize') return (Number(b.prize_pool) || 0) - (Number(a.prize_pool) || 0);
    if (sortBy === 'participants') return (b.participants_count ?? 0) - (a.participants_count ?? 0);
    return 0;
  });

  // Normalize for TournamentCard (which expects `title`, `start_date`, etc.)
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
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Esports <span className="brand-text">Tournaments</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Discover upcoming competitions, register your slot, and battle through the brackets to claim the prize.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input placeholder="Search tournament name..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[{ value: 'all', label: 'All Statuses' }, { value: 'registration', label: 'Open Registration' }, { value: 'in_progress', label: 'Live Now' }, { value: 'completed', label: 'Completed' }]} />
          <Select value={gameFilter} onChange={e => setGameFilter(e.target.value)} options={[{ value: 'all', label: 'All Games' }, ...games.map(g => ({ value: g, label: g }))]} />
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} options={[{ value: 'newest', label: 'Sort: Start Date' }, { value: 'prize', label: 'Sort: Prize Pool' }, { value: 'participants', label: 'Sort: Participants' }]} />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
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
          <p className="text-gray-400 text-sm">Try adjusting your search or filter settings.</p>
          <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter('all'); setGameFilter('all'); }}>Reset Filters</Button>
        </div>
      )}
    </div>
  );
}
