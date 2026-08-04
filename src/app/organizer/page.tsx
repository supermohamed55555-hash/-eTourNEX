'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { fetchOrganizerStats, fetchOrganizerTournaments } from '@/lib/actions/organizer-actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import TournamentCard from '@/components/gaming/TournamentCard';
import {
  Trophy, Users, Plus, BarChart3, Settings, ShieldCheck,
  Calendar, CheckCircle2, ChevronRight, Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrganizerDashboardPage() {
  const { profile: currentUser } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['organizer-stats'],
    queryFn: fetchOrganizerStats,
  });

  const { data: tournaments = [], isLoading: tourneysLoading } = useQuery({
    queryKey: ['organizer-tournaments'],
    queryFn: fetchOrganizerTournaments,
  });

  if (currentUser && currentUser.role !== 'organizer' && currentUser.role !== 'admin') {
    return notFound();
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> ORGANIZER DASHBOARD
          </div>
          <h1 className="text-3xl font-black text-white">
            Tournament <span className="brand-text">Organizer Center</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your competitions, participants, brackets, and match reporting.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/tournaments?create=true')}
          >
            Create Tournament
          </Button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <Link href="/organizer">
          <span className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-purple-glow-sm cursor-pointer inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Overview
          </span>
        </Link>
        <Link href="/organizer/tournaments">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Swords className="w-4 h-4" /> My Tournaments
          </span>
        </Link>
        <Link href="/organizer/analytics">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </span>
        </Link>
        <Link href="/organizer/settings">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </span>
        </Link>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-purple-400" /> Total Hosted
          </p>
          <div className="text-3xl font-black text-white">
            {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalTournaments ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-accent-neon" /> Active Now
          </p>
          <div className="text-3xl font-black text-accent-neon">
            {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.activeTournaments ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-secondary-400" /> Players Registered
          </p>
          <div className="text-3xl font-black text-white">
            {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalParticipants ?? 0}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400" /> Completed
          </p>
          <div className="text-3xl font-black text-amber-400">
            {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.completedTournaments ?? 0}
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            Your Created Tournaments
          </h2>
          <Link href="/organizer/tournaments" className="text-xs font-bold text-primary-400 hover:underline flex items-center gap-1">
            View All ({tournaments.length}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {tourneysLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-2xl space-y-3">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-lg font-bold text-gray-400">No tournaments created yet</h3>
            <p className="text-gray-600 text-xs">Start organizing your first competitive esports cup!</p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => router.push('/dashboard/tournaments?create=true')}
            >
              Create Tournament
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.slice(0, 6).map((t: any) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
