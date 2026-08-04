'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { fetchOrganizerTournaments } from '@/lib/actions/organizer-actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Trophy, Plus, ExternalLink, Users, Calendar, Swords,
  ShieldCheck, ChevronRight, BarChart3, Settings,
  Search, Filter, ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['all', 'registration', 'in_progress', 'completed', 'cancelled'] as const;

function statusBadgeVariant(status: string) {
  const map: Record<string, string> = {
    registration: 'registration',
    in_progress: 'in-progress',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return (map[status] || 'player') as any;
}

export default function OrganizerTournamentsPage() {
  const { profile: currentUser } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['organizer-tournaments'],
    queryFn: fetchOrganizerTournaments,
  });

  const filtered = tournaments.filter((t: any) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> ORGANIZER CENTER
          </div>
          <h1 className="text-3xl font-black text-white">
            My <span className="brand-text">Tournaments</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage all your created tournaments in one place.</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => router.push('/dashboard/tournaments?create=true')}
        >
          Create Tournament
        </Button>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <Link href="/organizer">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Overview
          </span>
        </Link>
        <Link href="/organizer/tournaments">
          <span className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-purple-glow-sm cursor-pointer inline-flex items-center gap-2">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all',
                statusFilter === s
                  ? 'bg-primary-600 text-white shadow-purple-glow-sm'
                  : 'glass text-gray-400 hover:text-white'
              )}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tournaments Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl space-y-3">
          <Swords className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-gray-400">No tournaments found</h3>
          <p className="text-gray-600 text-xs">
            {search ? 'Try a different search term.' : 'Create your first tournament to get started.'}
          </p>
          {!search && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => router.push('/dashboard/tournaments?create=true')}
            >
              Create Tournament
            </Button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Tournament</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Game</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Players</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.format?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {t.game?.color && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.game.color }} />
                        )}
                        <span className="text-gray-300 text-xs">{t.game?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusBadgeVariant(t.status)}>
                        {t.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span>{t.participants_count ?? 0}</span>
                        <span className="text-gray-500">/ {t.max_participants}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-500 text-xs">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/tournaments/${t.id}`}>
                          <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
