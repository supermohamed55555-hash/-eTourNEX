'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trophy, Plus, X, ChevronLeft, Save, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTournaments, fetchGames } from '@/lib/bracket/engine';
import { createTournament, updateTournament, cancelTournament } from '@/lib/actions/admin-actions';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Tournament, Game } from '@/lib/types/database';

type TournamentFormData = {
  name: string;
  description: string;
  rules: string;
  prize_pool: string;
  max_players: string;
  starts_at: string;
  game_id: string;
  banner_url: string;
};

const EMPTY_FORM: TournamentFormData = {
  name: '', description: '', rules: '', prize_pool: '', max_players: '8',
  starts_at: '', game_id: '', banner_url: ''
};

export default function AdminTournamentsPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: tournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TournamentFormData>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const createMut = useMutation({
    mutationFn: (data: any) => createTournament(data),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Tournament created successfully!' });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setShowForm(false);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTournament(id, data),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Tournament updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setShowForm(false);
      setEditingId(null);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelTournament(id),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Tournament cancelled.' });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, game_id: games[0]?.id || '' });
    setShowForm(true);
    setMessage(null);
  };

  const openEdit = (t: Tournament) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      rules: t.rules || '',
      prize_pool: t.prize_pool || '',
      max_players: t.max_players?.toString() || '8',
      starts_at: t.starts_at ? t.starts_at.slice(0, 16) : '',
      game_id: t.game_id || games[0]?.id || '',
      banner_url: t.banner_url || '',
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || null,
      rules: form.rules || null,
      prize_pool: form.prize_pool || null,
      max_players: form.max_players ? parseInt(form.max_players) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      game_id: form.game_id || null,
      banner_url: form.banner_url || null,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(data);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="text-center py-20 text-gray-400">Admin access required.</div>;
  }

  const statusConfig: Record<string, string> = {
    registration: 'text-secondary-500 bg-secondary-900/30 border-secondary-500/30',
    in_progress: 'text-accent-neon bg-accent-neon/10 border-accent-neon/40',
    completed: 'text-gray-400 bg-white/5 border-white/10',
    cancelled: 'text-red-400 bg-red-900/20 border-red-500/30',
  };

  const loading = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Tournament Manager</h1>
            <p className="text-xs text-gray-400">Create and manage tournaments</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold text-sm shadow-purple-glow hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Tournament
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/30 text-accent-neon' : 'bg-red-950/50 border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tournament Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-card rounded-3xl p-6 border border-white/10 shadow-glass overflow-y-auto max-h-[90vh] relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">
              {editingId ? 'Edit Tournament' : 'Create New Tournament'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Tournament Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g. eFootball Global Cup 2025" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Game</label>
                  <select value={form.game_id} onChange={e => setForm({ ...form, game_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500">
                    {games.map(g => <option key={g.id} value={g.id} className="bg-gaming-dark">{g.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Max Players</label>
                  <select value={form.max_players} onChange={e => setForm({ ...form, max_players: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500">
                    {[2, 4, 8, 16, 32].map(n => <option key={n} value={n} className="bg-gaming-dark">{n} Players</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Prize Pool</label>
                  <input value={form.prize_pool} onChange={e => setForm({ ...form, prize_pool: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g. $5,000 USD" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Start Date / Time</label>
                  <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Banner Image URL</label>
                  <input type="url" value={form.banner_url} onChange={e => setForm({ ...form, banner_url: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="https://..." />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                    placeholder="Brief overview of the tournament..." />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Rules</label>
                  <textarea rows={4} value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })}
                    className="w-full px-4 py-3 bg-gaming-dark rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                    placeholder="1. Rule one...&#10;2. Rule two..." />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold text-sm shadow-purple-glow hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournaments List */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <span>Tournament</span>
          <span className="hidden sm:block">Players</span>
          <span>Status</span>
          <span>Prize</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/5">
          {loadingT ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : (
            tournaments.map(t => (
              <div key={t.id} className="px-6 py-4 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.game?.name}</p>
                </div>
                <span className="hidden sm:block text-xs font-mono text-gray-400">
                  {t.participants_count || 0}{t.max_players ? `/${t.max_players}` : ''}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${statusConfig[t.status]}`}>
                  {t.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-accent-neon font-mono hidden sm:block">{t.prize_pool || '—'}</span>
                <div className="flex gap-2">
                  <Link href={`/admin/tournaments/${t.id}/bracket`}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-500/10 transition-colors" title="Manage Bracket">
                    <Trophy className="w-4 h-4" />
                  </Link>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {t.status !== 'cancelled' && t.status !== 'completed' && (
                    <button
                      onClick={() => cancelMut.mutate(t.id)}
                      disabled={cancelMut.isPending}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
