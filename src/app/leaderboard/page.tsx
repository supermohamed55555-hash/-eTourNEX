'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/lib/bracket/engine';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  // Compute combined player stats
  const players = leaderboard.map(lb => {
    const wr = lb.wins + lb.losses > 0
      ? Math.round((lb.wins / (lb.wins + lb.losses)) * 100)
      : 0;
    return { ...lb, winRate: wr };
  });

  const top3 = players.slice(0, 3);
  const rest  = players.slice(3);

  if (isLoading) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-12 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">

      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Trophy className="w-3.5 h-3.5" /> GLOBAL RANKINGS
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white">
          Esports <span className="brand-text">Leaderboard</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Top competitive players ranked by win rate, tournament victories, and total match history.
        </p>
      </div>

      {/* Top-3 Podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6">

          {/* 2nd */}
          <div className="order-2 md:order-1 glass-card rounded-3xl p-6 border border-slate-500/30 text-center space-y-4 relative card-hover">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">🥈</div>
            <Avatar src={top3[1].profile?.avatar_url} alt={top3[1].profile?.username || '2nd'} size="xl" seed={top3[1].profile?.username} className="mx-auto mt-2" />
            <div>
              <h3 className="font-bold text-white text-lg">{top3[1].profile?.username ?? '—'}</h3>
              <p className="text-xs text-gray-400">{top3[1].wins}W · {top3[1].losses}L</p>
            </div>
            <div className="p-2 rounded-xl bg-surface-3 text-slate-300 font-mono text-sm font-bold">{top3[1].winRate}% WR</div>
          </div>

          {/* 1st */}
          <div className="order-1 md:order-2 glass-card rounded-3xl p-8 border border-amber-500/40 text-center space-y-4 relative card-hover shadow-purple-glow">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">🏆</div>
            <Avatar src={top3[0].profile?.avatar_url} alt={top3[0].profile?.username || '1st'} size="2xl" seed={top3[0].profile?.username} className="mx-auto mt-2" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">CHAMPION</span>
              <h3 className="font-black text-white text-xl">{top3[0].profile?.username ?? '—'}</h3>
              <p className="text-xs text-gray-400">{top3[0].wins}W · {top3[0].losses}L</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-base font-black border border-amber-500/30">
              {top3[0].winRate}% Win Rate
            </div>
          </div>

          {/* 3rd */}
          <div className="order-3 glass-card rounded-3xl p-6 border border-amber-700/30 text-center space-y-4 relative card-hover">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">🥉</div>
            <Avatar src={top3[2].profile?.avatar_url} alt={top3[2].profile?.username || '3rd'} size="xl" seed={top3[2].profile?.username} className="mx-auto mt-2" />
            <div>
              <h3 className="font-bold text-white text-lg">{top3[2].profile?.username ?? '—'}</h3>
              <p className="text-xs text-gray-400">{top3[2].wins}W · {top3[2].losses}L</p>
            </div>
            <div className="p-2 rounded-xl bg-surface-3 text-amber-600 font-mono text-sm font-bold">{top3[2].winRate}% WR</div>
          </div>

        </div>
      )}

      {/* Full Rankings Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Tournaments</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id}>
                <td className="font-mono font-bold text-gray-400 text-sm">#{i + 1}</td>
                <td>
                  <Link href={`/players/${p.profile?.username}`} className="flex items-center gap-3 hover:text-primary-400 transition-colors">
                    <Avatar src={p.profile?.avatar_url} alt={p.profile?.username} size="sm" seed={p.profile?.username} />
                    <span className="font-bold text-white">{p.profile?.username ?? '—'}</span>
                  </Link>
                </td>
                <td className="font-mono text-gray-400">{p.tournaments_played}</td>
                <td className="font-mono text-emerald-400 font-bold">{p.wins}</td>
                <td className="font-mono text-red-400">{p.losses}</td>
                <td className="font-mono font-bold text-primary-400">{p.winRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
