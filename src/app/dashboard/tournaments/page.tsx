'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyTournaments, fetchOrganizedTournaments, fetchGames } from '@/lib/bracket/engine';
import { createTournament, updateTournament, generateBracket } from '@/lib/actions/admin-actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Trophy, Calendar, DollarSign, Users, Search, ChevronRight, Plus,
  Sparkles, Swords, Play, Edit2, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Tournament } from '@/lib/types/database';

type Tab = 'joined' | 'organized';

export default function DashboardTournamentsPage() {
  const { profile: user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>('joined');
  const [search, setSearch]       = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [name, setName]         = useState('');
  const [gameId, setGameId]     = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [prizePool, setPrizePool] = useState('');
  const [startsAt, setStartsAt]   = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules]         = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
      setActiveTab('organized');
    }
    const paramGameId = searchParams.get('gameId');
    if (paramGameId) {
      setGameId(paramGameId);
      setShowCreateModal(true);
      setActiveTab('organized');
    }
  }, [searchParams]);

  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';

  // Joined Tournaments Query
  const { data: joined = [], isLoading: loadingJoined } = useQuery({
    queryKey: ['my-tournaments', user?.id],
    queryFn: () => fetchMyTournaments(user!.id),
    enabled: !!user?.id,
  });

  // Organized Tournaments Query
  const { data: organized = [], isLoading: loadingOrganized } = useQuery({
    queryKey: ['organized-tournaments', user?.id],
    queryFn: () => fetchOrganizedTournaments(user!.id),
    enabled: !!user?.id,
  });

  // Games Query for Dropdown
  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  });

  // Create Tournament Mutation
  const createMut = useMutation({
    mutationFn: () =>
      createTournament({
        name,
        game_id: gameId || games[0]?.id || null,
        max_players: parseInt(maxPlayers) || 8,
        prize_pool: prizePool || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        banner_url: bannerUrl || null,
        description: description || null,
        rules: rules || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organized-tournaments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      closeModal();
      setActiveTab('organized');
    },
    onError: (err: any) => setFormError(err.message || 'Failed to create tournament.'),
  });

  // Generate Bracket Mutation
  const generateMut = useMutation({
    mutationFn: (tId: string) => generateBracket(tId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organized-tournaments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });

  const closeModal = () => {
    setShowCreateModal(false);
    setName('');
    setGameId('');
    setMaxPlayers('8');
    setPrizePool('');
    setStartsAt('');
    setBannerUrl('');
    setDescription('');
    setRules('');
    setFormError(null);
  };

  const list = activeTab === 'joined' ? joined : organized;
  const filtered = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">
              Tournament <span className="brand-text">Center</span>
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Manage your tournament entries and host custom events.
            </p>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (games.length > 0) setGameId(games[0].id);
              setShowCreateModal(true);
            }}
          >
            Host Tournament
          </Button>
        </div>

        {/* ── Tabs & Search ── */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl border border-white/5 self-start">
            <button
              onClick={() => setActiveTab('joined')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'joined'
                  ? 'bg-primary-600/30 border border-primary-500/40 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Trophy className="w-3.5 h-3.5" /> Joined ({joined.length})
            </button>
            <button
              onClick={() => setActiveTab('organized')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'organized'
                  ? 'bg-primary-600/30 border border-primary-500/40 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> My Events ({organized.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* ── List Content ── */}
        <div className="space-y-4">
          {(activeTab === 'joined' ? loadingJoined : loadingOrganized) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-white/10">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3 glass-card rounded-3xl border border-white/5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-2 border border-white/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 font-semibold text-sm">
                {search
                  ? 'No tournaments matching your search.'
                  : activeTab === 'joined'
                  ? "You haven't joined any tournaments yet."
                  : "You haven't hosted any tournaments yet."}
              </p>
              {activeTab === 'organized' ? (
                <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreateModal(true)}>
                  Host Your First Event
                </Button>
              ) : (
                <Link href="/tournaments">
                  <Button variant="ghost" size="sm" iconRight={<ChevronRight className="w-3.5 h-3.5" />}>
                    Browse Tournaments
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            filtered.map((t: Tournament) => (
              <div
                key={t.id}
                className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">{t.name}</h3>
                      {activeTab === 'organized' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          ORGANIZER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span>🎮 {t.game?.name || 'eFootball'}</span>
                      {t.starts_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.starts_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {t.participants_count ?? 0}/{t.max_players ?? 32}
                      </span>
                      {t.prize_pool && (
                        <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                          <DollarSign className="w-3 h-3" /> {t.prize_pool}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={t.status === 'registration' ? 'registration' : t.status === 'in_progress' ? 'in-progress' : 'completed'}>
                    {t.status.replace('_', ' ')}
                  </Badge>

                  {/* Organizer Controls */}
                  {activeTab === 'organized' && t.status === 'registration' && (
                    <Button
                      size="sm"
                      variant="neon"
                      icon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => generateMut.mutate(t.id)}
                      disabled={generateMut.isPending || (t.participants_count || 0) < 2}
                      title={(t.participants_count || 0) < 2 ? 'Needs at least 2 players' : 'Start Bracket'}
                    >
                      {generateMut.isPending ? 'Generating…' : 'Start Bracket'}
                    </Button>
                  )}

                  <Link href={`/tournaments/${t.id}`}>
                    <Button variant="ghost" size="sm" iconRight={<ChevronRight className="w-3.5 h-3.5" />}>
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Host Custom Tournament Modal ── */}
        {showCreateModal && (
          <Modal
            title="Host Custom Tournament"
            open={showCreateModal}
            onClose={closeModal}
          >
            <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <Input
                label="Tournament Title"
                placeholder="e.g. Weekly Pro Invitational #1"
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Esports Title / Game</label>
                  <select
                    value={gameId}
                    onChange={e => setGameId(e.target.value)}
                    className="input w-full"
                  >
                    {games.map(g => (
                      <option key={g.id} value={g.id} className="bg-gaming-dark">
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Max Competitors</label>
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(e.target.value)}
                    className="input w-full"
                  >
                    {[2, 4, 8, 16, 32].map(n => (
                      <option key={n} value={n.toString()} className="bg-gaming-dark">
                        {n} Players (Single Elimination)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prize Pool (optional)"
                  placeholder="e.g. $500 or 1,000 PTS"
                  value={prizePool}
                  onChange={e => setPrizePool(e.target.value)}
                />

                <Input
                  label="Start Date / Time"
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                />
              </div>

              <Input
                label="Banner Image URL (optional)"
                placeholder="https://images.unsplash.com/..."
                value={bannerUrl}
                onChange={e => setBannerUrl(e.target.value)}
              />

              <Textarea
                label="Tournament Overview / Description"
                placeholder="Brief summary of format, rules, or requirements..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />

              <Textarea
                label="Rules & Regulations"
                placeholder="1. Standard match rules...&#10;2. Screenshot required..."
                value={rules}
                onChange={e => setRules(e.target.value)}
                rows={3}
              />

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={createMut.isPending || !name.trim()}>
                  {createMut.isPending ? 'Creating Event…' : 'Publish Tournament'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

      </main>
    </div>
  );
}
