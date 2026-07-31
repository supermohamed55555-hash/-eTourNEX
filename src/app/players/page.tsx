'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchProfiles, fetchLeaderboard } from '@/lib/bracket/engine';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Skeleton, PlayerCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { Search, Users, Grid3X3, List } from 'lucide-react';

export default function PlayersPage() {
  const { data: profiles = [], isLoading: loadingP } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const { data: leaderboard = [], isLoading: loadingL } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  const isLoading = loadingP || loadingL;

  // Merge profiles with leaderboard stats
  const players = profiles.map(p => {
    const lb = leaderboard.find(l => l.player_id === p.id);
    return { ...p, wins: lb?.wins ?? 0, losses: lb?.losses ?? 0 };
  }).sort((a, b) => {
    const wrA = a.wins / (a.wins + a.losses || 1);
    const wrB = b.wins / (b.wins + b.losses || 1);
    return wrB - wrA;
  });

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = players.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 sm:p-12 border border-white/10">
        <div className="absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Competitive <span className="brand-text">Players</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">Browse all registered competitors, view their stats, win rates, and tournament history.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
        </div>
        <div className="flex items-center gap-1 glass p-1 rounded-xl border border-white/10">
          <button onClick={() => setView('grid')} className={cn('p-2 rounded-lg transition-all', view === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white')}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={cn('p-2 rounded-lg transition-all', view === 'list' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((p, i) => {
            const wr = Math.round((p.wins / (p.wins + p.losses || 1)) * 100);
            return (
              <Link key={p.id} href={`/players/${p.username}`} className="block">
                <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-3 text-center card-hover h-full">
                  <div className="relative">
                    {i < 3 && (
                      <span className={cn('absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black z-10',
                        i === 0 && 'bg-amber-400 text-black', i === 1 && 'bg-slate-400 text-black', i === 2 && 'bg-amber-700 text-white'
                      )}>#{i + 1}</span>
                    )}
                    <Avatar src={p.avatar_url} alt={p.username} size="lg" seed={p.username} rank={i + 1} verified={p.email_confirmed} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-white text-xs leading-tight">{p.username}</p>
                    <p className="text-[10px] text-gray-500">{p.wins}W / {p.losses}L</p>
                  </div>
                  <div className="w-full pt-2 border-t border-white/10">
                    <p className={cn('text-sm font-black font-mono', wr >= 70 ? 'text-accent-neon' : wr >= 50 ? 'text-secondary-400' : 'text-gray-400')}>{wr}%</p>
                    <p className="text-[10px] text-gray-500">win rate</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
          <table className="data-table">
            <thead>
              <tr><th>Rank</th><th>Player</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const wr = Math.round((p.wins / (p.wins + p.losses || 1)) * 100);
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-gray-500 font-bold text-xs">#{i + 1}</td>
                    <td>
                      <Link href={`/players/${p.username}`} className="flex items-center gap-3 hover:text-primary-400 transition-colors">
                        <Avatar src={p.avatar_url} alt={p.username} size="sm" seed={p.username} />
                        <span className="font-bold text-white">{p.username}</span>
                      </Link>
                    </td>
                    <td className="font-mono text-emerald-400 font-bold">{p.wins}</td>
                    <td className="font-mono text-red-400">{p.losses}</td>
                    <td className={cn('font-mono font-bold', wr >= 70 ? 'text-accent-neon' : wr >= 50 ? 'text-secondary-400' : 'text-gray-400')}>{wr}%</td>
                    <td><span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', p.email_confirmed ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 bg-white/5')}>{p.email_confirmed ? 'Verified' : 'Pending'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
