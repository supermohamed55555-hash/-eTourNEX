'use client';

import React from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import {
  fetchTournaments,
  fetchAchievements,
  fetchPlayerAchievements,
  fetchPlayerStats,
  fetchPointsHistory,
} from '@/lib/bracket/engine';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton, StatSkeleton } from '@/components/ui/Skeleton';
import { Trophy, Swords, Flame, Zap, Award, CheckCircle2, TrendingUp, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile: user } = useAuth();

  const { data: tournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['playerStats', user?.id],
    queryFn: () => user?.id ? fetchPlayerStats(user.id) : null,
    enabled: !!user?.id,
  });

  const { data: pointsChart = [] } = useQuery({
    queryKey: ['pointsHistory', user?.id],
    queryFn: () => user?.id ? fetchPointsHistory(user.id, 10) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
  });

  const { data: myAchievements = [] } = useQuery({
    queryKey: ['playerAchievements', user?.id],
    queryFn: () => user?.id ? fetchPlayerAchievements(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  const points = stats?.points ?? 0;
  const totalMatches = stats?.totalMatches ?? 0;
  const winRate = stats?.winRate ?? 0;
  const myTournaments = tournaments.slice(0, 3);
  const isLoading = loadingT || loadingStats;
  const unlockedSet = new Set(myAchievements.map(a => a.achievement_id));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-8">

        {/* Welcome */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-radial opacity-60" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-white">
                Welcome back, <span className="brand-text">{user?.username || 'Player'}</span> 👋
              </h1>
              {stats?.leaderboardRank && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <Star className="w-3.5 h-3.5" /> Rank #{stats.leaderboardRank}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">Your competitive gaming overview for Season 4.</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Total Points" value={points} icon={<Zap className="w-5 h-5 text-accent-neon" />} />
              <StatCard label="Tournaments Entered" value={stats?.tournamentsPlayed ?? 0} icon={<Trophy className="w-5 h-5 text-primary-400" />} />
              <StatCard label="Win Rate" value={`${winRate}%`} icon={<Flame className="w-5 h-5 text-amber-400" />} />
              <StatCard label="Total Matches" value={totalMatches} icon={<Swords className="w-5 h-5 text-secondary-400" />} />
            </>
          )}
        </div>

        {/* Points Progress Chart */}
        {pointsChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> Rating & Points Growth
                </span>
                {user && (
                  <Link href={`/players/${user.username}`} className="text-xs text-primary-400 hover:text-primary-300 font-bold">
                    Full Profile Stats →
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pointsChart}>
                    <defs>
                      <linearGradient id="dashPtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#151522',
                        borderColor: '#222236',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`${val} pts`, 'Points']}
                    />
                    <Area
                      type="monotone"
                      dataKey="points"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#dashPtGrad)"
                      dot={{ fill: '#10b981', r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements Quick Glance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" /> Recent Achievements
              </span>
              {user && (
                <Link href={`/players/${user.username}`} className="text-xs text-primary-400 hover:text-primary-300 font-bold">
                  View All ({unlockedSet.size}/{achievements.length}) →
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.slice(0, 4).map(ach => {
                const isUnlocked = unlockedSet.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isUnlocked
                        ? 'bg-purple-600/10 border-purple-500/30'
                        : 'bg-surface-2/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{ach.title}</p>
                      <p className="text-[10px] text-gray-400">{ach.description}</p>
                    </div>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-mono text-gray-500">Locked</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
