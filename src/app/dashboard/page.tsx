'use client';

import React from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchTournaments, fetchLeaderboard } from '@/lib/bracket/engine';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton, StatSkeleton } from '@/components/ui/Skeleton';
import { Trophy, Swords, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile: user } = useAuth();

  const { data: tournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: leaderboard = [], isLoading: loadingL } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  const lb = leaderboard.find(l => l.player_id === user?.id);
  const wins   = lb?.wins   ?? 0;
  const losses = lb?.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const myTournaments = tournaments.slice(0, 3);
  const isLoading = loadingT || loadingL;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-8">

        {/* Welcome */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-radial opacity-60" />
          <div className="relative z-10 space-y-1">
            <h1 className="text-3xl font-black text-white">
              Welcome back, <span className="brand-text">{user?.username || 'Player'}</span> 👋
            </h1>
            <p className="text-gray-400 text-sm">Your competitive gaming overview for Season 4.</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {isLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Tournaments Entered" value={myTournaments.length} icon={<Trophy className="w-5 h-5 text-primary-400" />} />
              <StatCard label="Win Rate" value={`${winRate}%`} icon={<Flame className="w-5 h-5 text-amber-400" />} />
              <StatCard label="Total Matches" value={totalMatches} icon={<Swords className="w-5 h-5 text-secondary-400" />} />
            </>
          )}
        </div>

        {/* Active Tournaments */}
        <Card>
          <CardHeader><CardTitle>Recent Tournaments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-surface-2 border border-white/10">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            ) : myTournaments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No tournaments yet. Browse and join one!</p>
            ) : (
              myTournaments.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/10">
                  <div>
                    <h4 className="font-bold text-white text-sm">{t.name}</h4>
                    <p className="text-xs text-gray-400">
                      {t.game?.name ?? 'eFootball'} •{' '}
                      {t.starts_at ? new Date(t.starts_at).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={t.status === 'registration' ? 'registration' : t.status === 'in_progress' ? 'in-progress' : 'completed'}>
                      {t.status.replace('_', ' ')}
                    </Badge>
                    <Link href={`/tournaments/${t.id}`} className="text-xs text-primary-400 hover:text-primary-300 font-bold">View →</Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
