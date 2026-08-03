'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  fetchProfileByUsername,
  fetchAchievements,
  fetchPlayerAchievements,
  fetchPlayerBadges,
  fetchPlayerStats,
  fetchPlayerMatchHistory,
  fetchPointsHistory,
} from '@/lib/bracket/engine';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PlayerBadges } from '@/components/gaming/PlayerBadges';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Trophy, Swords, Award, Crown, Gamepad2, Lock, CheckCircle2,
  Zap, TrendingUp, Flame, Star, Target, Shield, ChevronRight,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────

function getAchievementIcon(iconName: string) {
  switch (iconName) {
    case 'Gamepad2': return <Gamepad2 className="w-5 h-5" />;
    case 'Swords':   return <Swords   className="w-5 h-5" />;
    case 'Trophy':   return <Trophy   className="w-5 h-5" />;
    case 'Crown':    return <Crown    className="w-5 h-5" />;
    default:         return <Award    className="w-5 h-5" />;
  }
}

const REASON_LABELS: Record<string, string> = {
  match_win:            'Match Win',
  tournament_champion:  'Tournament Champion',
  achievement_unlocked: 'Achievement',
  registration:         'Registration',
};

// ─── Page ────────────────────────────────────────────────────────────────

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);

  const { data: player, isLoading: loadingP } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username),
  });

  const { data: allAchievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
  });

  const { data: playerAchievements = [] } = useQuery({
    queryKey: ['playerAchievements', player?.id],
    queryFn: () => player?.id ? fetchPlayerAchievements(player.id) : Promise.resolve([]),
    enabled: !!player?.id,
  });

  const { data: playerBadges = [] } = useQuery({
    queryKey: ['playerBadges', player?.id],
    queryFn: () => player?.id ? fetchPlayerBadges(player.id) : Promise.resolve([]),
    enabled: !!player?.id,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['playerStats', player?.id],
    queryFn: () => fetchPlayerStats(player!.id),
    enabled: !!player?.id,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['matchHistory', player?.id],
    queryFn: () => fetchPlayerMatchHistory(player!.id, 15),
    enabled: !!player?.id,
  });

  const { data: pointsChart = [] } = useQuery({
    queryKey: ['pointsHistory', player?.id],
    queryFn: () => fetchPointsHistory(player!.id, 15),
    enabled: !!player?.id,
  });

  // ── Loading ──
  if (loadingP) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!player) notFound();

  const unlockedAchievementIds = new Set(playerAchievements.map(pa => pa.achievement_id));
  const unlockedCount = unlockedAchievementIds.size;

  const streakLabel = stats
    ? stats.currentStreak > 0
      ? `${stats.currentStreak}W Streak 🔥`
      : stats.currentStreak < 0
      ? `${Math.abs(stats.currentStreak)}L Streak`
      : '—'
    : '—';

  const streakColor = stats
    ? stats.currentStreak > 0
      ? 'text-emerald-400'
      : stats.currentStreak < 0
      ? 'text-red-400'
      : 'text-gray-400'
    : 'text-gray-400';

  // Radar chart data
  const radarData = stats
    ? [
        { metric: 'Win Rate', value: stats.winRate },
        { metric: 'Matches',  value: Math.min(stats.totalMatches * 5, 100) },
        { metric: 'Points',   value: Math.min(stats.points / 10, 100) },
        { metric: 'Trophies', value: Math.min(stats.tournamentsWon * 25, 100) },
        { metric: 'Streak',   value: Math.min(Math.max(stats.longestWinStreak * 15, 0), 100) },
      ]
    : [];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* ── Profile Hero ── */}
      <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-mesh opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <Avatar
            src={player.avatar_url}
            alt={player.username}
            size="2xl"
            seed={player.username}
            verified={player.email_confirmed}
          />
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-white">
                {player.display_name || player.username}
              </h1>
              <Badge variant={player.role === 'admin' ? 'admin' : 'player'}>
                {player.role}
              </Badge>
              {stats?.leaderboardRank && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <Star className="w-3 h-3" /> #{stats.leaderboardRank} Rank
                </span>
              )}
            </div>

            <PlayerBadges
              playerBadges={playerBadges}
              emailConfirmed={player.email_confirmed}
              role={player.role}
              tournamentsWon={stats?.tournamentsWon || 0}
              size="md"
              className="justify-center sm:justify-start my-2"
            />

            <p className="text-gray-400 text-sm">@{player.username}</p>
            {player.country && <p className="text-xs text-gray-500">📍 {player.country}</p>}
            {player.bio && (
              <p className="text-sm text-gray-400 max-w-md leading-relaxed">{player.bio}</p>
            )}

            {/* Streak pill */}
            {stats && stats.currentStreak !== 0 && (
              <div className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                stats.currentStreak > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              )}>
                <Flame className="w-3.5 h-3.5" />
                {streakLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loadingStats ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <Card className="text-center p-4 border-emerald-500/30 bg-emerald-500/5 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> Points
              </p>
              <p className="text-3xl font-black text-emerald-300 font-mono mt-1">{stats?.points ?? 0}</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Matches</p>
              <p className="text-3xl font-black text-white font-mono mt-1">{stats?.totalMatches ?? 0}</p>
            </Card>
            <Card className="text-center p-4 border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> Wins
              </p>
              <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{stats?.wins ?? 0}</p>
            </Card>
            <Card className="text-center p-4 border-red-500/20">
              <p className="text-[10px] font-bold text-red-400 uppercase">Losses</p>
              <p className="text-3xl font-black text-red-400 font-mono mt-1">{stats?.losses ?? 0}</p>
            </Card>
            <Card className="text-center p-4 border-primary-500/20">
              <p className="text-[10px] font-bold text-primary-400 uppercase">Win Rate</p>
              <p className="text-3xl font-black text-primary-400 font-mono mt-1">{stats?.winRate ?? 0}%</p>
            </Card>
            <Card className="text-center p-4 border-amber-500/20">
              <p className="text-[10px] font-bold text-amber-400 uppercase flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3" /> Trophies
              </p>
              <p className="text-3xl font-black text-amber-400 font-mono mt-1">{stats?.tournamentsWon ?? 0}</p>
            </Card>
          </>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Points Over Time */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Points Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pointsChart.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-sm text-gray-500">
                  No point transactions yet.
                </div>
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pointsChart}>
                      <defs>
                        <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
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
                        formatter={(val: any, _: any, props: any) => [
                          `${val} pts (${props.payload.gained > 0 ? '+' : ''}${props.payload.gained})`,
                          REASON_LABELS[props.payload.reason] || props.payload.reason,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="points"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#ptGrad)"
                        dot={{ fill: '#10b981', r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary-400" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 || !stats?.totalMatches ? (
              <div className="flex items-center justify-center h-44 text-sm text-gray-500">
                Play matches to see stats.
              </div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff10" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Radar
                      dataKey="value"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            {stats && stats.totalMatches > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-center p-2 rounded-xl bg-surface-2 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase">Best Streak</p>
                  <p className="text-lg font-black text-emerald-400">{stats.longestWinStreak}W</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-surface-2 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase">Tournaments</p>
                  <p className="text-lg font-black text-primary-400">{stats.tournamentsPlayed}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Match History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary-400" /> Match History
            <span className="ml-auto text-xs text-gray-500 font-normal">Last 15 matches</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No confirmed matches yet. Compete to build your history!
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((m: any) => {
                const opponent = m.opponent?.profile;
                const tournamentName = m.tournament?.name;
                const gameIcon = m.tournament?.game?.icon_url;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-xl border transition-all',
                      m.won
                        ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30'
                        : 'bg-red-500/5 border-red-500/10 hover:border-red-500/25'
                    )}
                  >
                    {/* Win/Loss indicator */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm',
                      m.won ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    )}>
                      {m.won ? 'W' : 'L'}
                    </div>

                    {/* Opponent */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {opponent ? (
                        <>
                          <Avatar
                            src={opponent.avatar_url}
                            alt={opponent.username}
                            seed={opponent.username}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/players/${opponent.username}`}
                              className="text-sm font-bold text-white hover:text-primary-400 transition-colors truncate block"
                            >
                              {opponent.username}
                            </Link>
                            {tournamentName && (
                              <p className="text-[10px] text-gray-500 truncate">{tournamentName} · {m.round_name}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-gray-400">TBD</p>
                          <p className="text-[10px] text-gray-500">{m.round_name}</p>
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-sm font-mono text-gray-300 shrink-0">
                      {m.score_a ?? '?'} - {m.score_b ?? '?'}
                    </div>

                    {/* Date */}
                    <div className="text-[10px] text-gray-500 shrink-0 hidden sm:block">
                      {new Date(m.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Achievements + Trophies Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Achievements */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" /> Achievements
                </span>
                <span className="text-xs text-gray-400 font-mono bg-surface-2 px-2 py-1 rounded-lg border border-white/5">
                  {unlockedCount} / {allAchievements.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="mb-5">
                <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-primary-500 rounded-full transition-all"
                    style={{ width: `${allAchievements.length ? (unlockedCount / allAchievements.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-right">
                  {allAchievements.length
                    ? Math.round((unlockedCount / allAchievements.length) * 100)
                    : 0}% complete
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allAchievements.map(ach => {
                  const isUnlocked = unlockedAchievementIds.has(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={cn(
                        'p-4 rounded-2xl border flex items-start gap-3 transition-all',
                        isUnlocked
                          ? 'bg-purple-600/10 border-purple-500/30 shadow-purple-glow-sm'
                          : 'bg-surface-2/40 border-white/5 opacity-50'
                      )}
                    >
                      <div className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        isUnlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-surface-3 text-gray-500'
                      )}>
                        {getAchievementIcon(ach.icon)}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-sm text-white truncate">{ach.title}</p>
                          {isUnlocked
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            : <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{ach.description}</p>
                        <p className="text-[11px] font-bold text-purple-400">+{ach.points_reward} PTS</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trophies + Rank */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Trophies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats && stats.tournamentsWon > 0 ? (
                Array.from({ length: stats.tournamentsWon }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">Tournament Champion</p>
                      <p className="text-xs text-gray-400">Season victory</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">
                  No trophies yet. Keep competing!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          {stats && stats.totalMatches > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" /> Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Global Rank',       value: stats.leaderboardRank ? `#${stats.leaderboardRank}` : 'Unranked', color: 'text-amber-400' },
                  { label: 'Win Streak',        value: `${stats.longestWinStreak}W`, color: 'text-emerald-400' },
                  { label: 'Current Streak',    value: streakLabel, color: streakColor },
                  { label: 'Tournaments Played',value: stats.tournamentsPlayed.toString(), color: 'text-primary-400' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-2.5 rounded-xl bg-surface-2 border border-white/5">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                  </div>
                ))}
                <Link
                  href="/leaderboard"
                  className="flex items-center justify-center gap-1.5 w-full mt-2 py-2 rounded-xl text-xs font-semibold text-primary-400 hover:text-white hover:bg-primary-600/10 transition-all border border-transparent hover:border-primary-500/20"
                >
                  View Leaderboard <ChevronRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
