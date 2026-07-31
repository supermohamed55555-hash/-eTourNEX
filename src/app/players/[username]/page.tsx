'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchProfileByUsername, fetchLeaderboard } from '@/lib/bracket/engine';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trophy, Swords, Award } from 'lucide-react';

export default function PlayerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: player, isLoading: loadingP } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfileByUsername(username),
  });

  const { data: leaderboard = [], isLoading: loadingL } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  if (loadingP || loadingL) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!player) notFound();

  const lb = leaderboard.find(l => l.player_id === player.id);
  const wins  = lb?.wins  ?? 0;
  const losses = lb?.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* Profile Hero */}
      <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-mesh opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <Avatar src={player.avatar_url} alt={player.username} size="2xl" seed={player.username} verified={player.email_confirmed} />
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-white">{player.display_name || player.username}</h1>
              <Badge variant={player.role === 'admin' ? 'admin' : 'player'}>{player.role}</Badge>
              {player.email_confirmed && <Badge variant="verified">Verified</Badge>}
            </div>
            <p className="text-gray-400 text-sm">@{player.username}</p>
            {player.country && <p className="text-xs text-gray-500">📍 {player.country}</p>}
            {player.bio && <p className="text-sm text-gray-400 max-w-md">{player.bio}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center p-5">
          <p className="text-xs font-bold text-gray-400 uppercase">Matches</p>
          <p className="text-3xl font-black text-white font-mono mt-1">{totalMatches}</p>
        </Card>
        <Card className="text-center p-5">
          <p className="text-xs font-bold text-gray-400 uppercase">Wins</p>
          <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{wins}</p>
        </Card>
        <Card className="text-center p-5">
          <p className="text-xs font-bold text-gray-400 uppercase">Losses</p>
          <p className="text-3xl font-black text-red-400 font-mono mt-1">{losses}</p>
        </Card>
        <Card className="text-center p-5">
          <p className="text-xs font-bold text-gray-400 uppercase">Win Rate</p>
          <p className="text-3xl font-black text-primary-400 font-mono mt-1">{winRate}%</p>
        </Card>
      </div>

      {/* Activity + Trophies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Swords className="w-5 h-5 text-primary-400" /> Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="py-10 text-center text-gray-500 text-sm">
                No recent match history recorded yet for this season.
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" /> Trophies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lb && lb.tournaments_won > 0 ? (
              Array.from({ length: lb.tournaments_won }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Tournament Champion</p>
                    <p className="text-xs text-gray-400">Season victory</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">No trophies yet. Keep competing!</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
