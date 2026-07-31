'use client';

import React, { useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchMyTournaments } from '@/lib/bracket/engine';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trophy, Calendar, DollarSign, Users, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardTournamentsPage() {
  const { profile: user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['my-tournaments', user?.id],
    queryFn: () => fetchMyTournaments(user!.id),
    enabled: !!user?.id,
  });

  const filtered = tournaments.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-white">My <span className="brand-text">Tournaments</span></h1>
        </div>

        <Input
          placeholder="Search tournaments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-white/10">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {search ? 'No tournaments matching your search.' : 'You haven\'t joined any tournaments yet.'}
            </div>
          ) : (
            filtered.map(t => (
              <div key={t.id} className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{t.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      {t.starts_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(t.starts_at).toLocaleDateString()}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.participants_count ?? 0}/{t.max_players ?? 32}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-amber-400" /> ${Number(t.prize_pool) || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={t.status === 'registration' ? 'registration' : t.status === 'in_progress' ? 'in-progress' : 'completed'}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                  <Link href={`/tournaments/${t.id}`}>
                    <Button variant="ghost" size="sm" iconRight={<ChevronRight className="w-3.5 h-3.5" />}>View</Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
