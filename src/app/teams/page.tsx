'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { fetchTeams, fetchMyTeam } from '@/lib/bracket/engine';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users, Plus, Trophy, Shield, Search, Globe,
  ChevronRight, Star, Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team } from '@/lib/types/database';

const FILTERS = [
  { id: 'all',        label: 'All Teams' },
  { id: 'recruiting', label: 'Recruiting' },
];

function TeamCard({ team }: { team: Team }) {
  const winRate = team.wins + team.losses > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0;

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group glass-card rounded-2xl overflow-hidden hover:border-primary-500/40 hover:shadow-purple-glow-sm transition-all duration-300 block"
    >
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary-900/60 to-secondary-900/60 overflow-hidden">
        {team.banner_url ? (
          <img
            src={team.banner_url}
            alt={team.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800/40 via-secondary-800/30 to-transparent" />
        )}
        {/* Recruiting badge */}
        {team.is_recruiting && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-neon/20 text-accent-neon border border-accent-neon/30">
              RECRUITING
            </span>
          </div>
        )}
      </div>

      <div className="p-4 -mt-8 relative">
        {/* Logo */}
        <div className="w-14 h-14 rounded-xl border-2 border-surface-3 bg-surface-2 flex items-center justify-center overflow-hidden shadow-lg mb-3">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
          ) : (
            <Shield className="w-6 h-6 text-primary-400" />
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate group-hover:text-primary-300 transition-colors">
              {team.name}
              {team.tag && (
                <span className="ml-2 text-xs font-mono text-gray-500">[{team.tag}]</span>
              )}
            </h3>
            {team.country && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3" />
                {team.country}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>

        {team.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{team.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5">
          <div className="text-center">
            <p className="text-sm font-bold text-white">{team.members_count ?? 0}</p>
            <p className="text-[10px] text-gray-500">Members</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-accent-neon">{winRate}%</p>
            <p className="text-[10px] text-gray-500">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-accent-amber">{team.tournaments_won}</p>
            <p className="text-[10px] text-gray-500">Titles</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TeamCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Skeleton className="h-24 w-full" />
      <div className="p-4 -mt-8">
        <Skeleton className="w-14 h-14 rounded-xl mb-3" />
        <Skeleton className="h-5 w-36 mb-1" />
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-4/5" />
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5">
          {[0, 1, 2].map(i => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-5 w-8 mx-auto" />
              <Skeleton className="h-2.5 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { profile: user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', filter],
    queryFn: () => fetchTeams({ recruiting: filter === 'recruiting' }),
  });

  const { data: myTeamMembership } = useQuery({
    queryKey: ['my-team', user?.id],
    queryFn: () => (user?.id ? fetchMyTeam(user.id) : null),
    enabled: !!user?.id,
  });

  const filtered = teams.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tag?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-500/30">
                <Shield className="w-7 h-7 text-primary-400" />
              </div>
              Teams
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              {teams.length} team{teams.length !== 1 ? 's' : ''} competing on eTourNEX
            </p>
          </div>

          {user && !myTeamMembership && (
            <Button
              onClick={() => router.push('/teams/create')}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Team
            </Button>
          )}
          {user && myTeamMembership && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/teams/${(myTeamMembership.team as any)?.slug}`)}
              icon={<Shield className="w-4 h-4" />}
            >
              My Team
            </Button>
          )}
        </div>

        {/* My Team Banner */}
        {myTeamMembership && (
          <Link
            href={`/teams/${(myTeamMembership.team as any)?.slug}`}
            className="block glass-card rounded-2xl p-4 mb-6 border-primary-500/30 hover:border-primary-500/60 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                {(myTeamMembership.team as any)?.logo_url ? (
                  <img src={(myTeamMembership.team as any).logo_url} className="w-full h-full object-cover rounded-xl" alt="" />
                ) : (
                  <Shield className="w-5 h-5 text-primary-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Your Team</p>
                <p className="font-bold text-white truncate">{(myTeamMembership.team as any)?.name}</p>
              </div>
              <Badge variant={
                myTeamMembership.role === 'captain' ? 'gold' :
                myTeamMembership.role === 'officer' ? 'admin' : 'player'
              }>
                {myTeamMembership.role}
              </Badge>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </Link>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search teams or tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  filter === f.id
                    ? 'bg-primary-600 text-white shadow-purple-glow-sm'
                    : 'glass text-gray-400 hover:text-white hover:bg-white/10'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <TeamCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
              <Swords className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-400 mb-2">No teams found</h3>
            <p className="text-gray-600 text-sm mb-6">
              {search ? `No teams match "${search}"` : 'Be the first to create a team!'}
            </p>
            {user && !myTeamMembership && (
              <Button onClick={() => router.push('/teams/create')} icon={<Plus className="w-4 h-4" />}>
                Create Team
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(team => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
