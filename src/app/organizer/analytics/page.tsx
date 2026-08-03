'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchOrganizerTournaments, fetchOrganizerStats } from '@/lib/actions/organizer-actions';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Trophy, Users, Swords, BarChart3, ShieldCheck, Settings,
  TrendingUp, Percent, Calendar, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrganizerAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['organizer-stats'],
    queryFn: fetchOrganizerStats,
  });

  const { data: tournaments = [], isLoading: tourneysLoading } = useQuery({
    queryKey: ['organizer-tournaments'],
    queryFn: fetchOrganizerTournaments,
  });

  const totalCapacity = tournaments.reduce((acc: number, t: any) => acc + (t.max_participants || 0), 0);
  const fillRate = totalCapacity > 0
    ? Math.round(((stats?.totalParticipants ?? 0) / totalCapacity) * 100)
    : 0;

  const byStatus = ['registration', 'in_progress', 'completed', 'cancelled'].map(s => ({
    status: s,
    count: tournaments.filter((t: any) => t.status === s).length,
  }));

  const recentTournaments = [...tournaments]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> ORGANIZER CENTER
        </div>
        <h1 className="text-3xl font-black text-white">
          Performance <span className="brand-text">Analytics</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Insights across all tournaments you have organized.</p>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <Link href="/organizer">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Overview
          </span>
        </Link>
        <Link href="/organizer/tournaments">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Swords className="w-4 h-4" /> My Tournaments
          </span>
        </Link>
        <Link href="/organizer/analytics">
          <span className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-purple-glow-sm cursor-pointer inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </span>
        </Link>
        <Link href="/organizer/settings">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </span>
        </Link>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Hosted', value: stats?.totalTournaments ?? 0, icon: Trophy, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
          { label: 'Total Players', value: stats?.totalParticipants ?? 0, icon: Users, color: 'text-secondary-400', bgColor: 'bg-secondary-500/10' },
          { label: 'Fill Rate', value: `${fillRate}%`, icon: Percent, color: 'text-accent-neon', bgColor: 'bg-accent-neon/10' },
          { label: 'Completed', value: stats?.completedTournaments ?? 0, icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color, bgColor }) => (
          <div key={label} className="glass-card rounded-2xl p-5 border border-white/10 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold">{label}</p>
              <p className={cn('text-2xl font-black', color)}>
                {statsLoading ? <Skeleton className="h-7 w-10" /> : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Tournament Status Breakdown
          </h2>
          {byStatus.map(({ status, count }) => {
            const pct = stats?.totalTournaments ? Math.round((count / stats.totalTournaments) * 100) : 0;
            const colorMap: Record<string, string> = {
              registration: 'bg-blue-500',
              in_progress: 'bg-accent-neon',
              completed: 'bg-amber-500',
              cancelled: 'bg-danger',
            };
            return (
              <div key={status} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
                  <span className="font-bold text-white">{count} ({pct}%)</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-500', colorMap[status])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-secondary-400" />
            Recent Tournaments
          </h2>
          {tourneysLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : recentTournaments.length === 0 ? (
            <p className="text-gray-500 text-sm">No tournaments created yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTournaments.map((t: any) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">{t.name}</p>
                      <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{t.participants_count ?? 0} players</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
