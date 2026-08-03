'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { notFound } from 'next/navigation';
import { fetchAllGames, createGame, updateGame, deleteGame } from '@/lib/actions/game-actions';
import type { Game } from '@/lib/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Gamepad2, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  Tag, Shield, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CATEGORIES = ['Sports', 'Fighting', 'Battle Royale', 'FPS', 'MOBA', 'Racing', 'Strategy'];

export default function AdminGamesPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editGame, setEditGame]     = useState<Game | null>(null);

  // Form State
  const [name, setName]             = useState('');
  const [category, setCategory]     = useState('Sports');
  const [publisher, setPublisher]   = useState('');
  const [iconUrl, setIconUrl]       = useState('🎮');
  const [bannerUrl, setBannerUrl]   = useState('');
  const [color, setColor]           = useState('#8B5CF6');
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: () => fetchAllGames(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createGame({
        name,
        category,
        publisher: publisher || null,
        icon_url: iconUrl || '🎮',
        banner_url: bannerUrl || null,
        color: color || '#8B5CF6',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to create game.'),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateGame(editGame!.id, {
        name,
        category,
        publisher: publisher || null,
        icon_url: iconUrl || '🎮',
        banner_url: bannerUrl || null,
        color: color || '#8B5CF6',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to update game.'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (g: Game) => updateGame(g.id, { is_active: !g.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  const openCreateModal = () => {
    setEditGame(null);
    setName('');
    setCategory('Sports');
    setPublisher('');
    setIconUrl('🎮');
    setBannerUrl('');
    setColor('#8B5CF6');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (g: Game) => {
    setEditGame(g);
    setName(g.name);
    setCategory(g.category || 'Sports');
    setPublisher(g.publisher || '');
    setIconUrl(g.icon_url || '🎮');
    setBannerUrl(g.banner_url || '');
    setColor(g.color || '#8B5CF6');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditGame(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <Gamepad2 className="w-3.5 h-3.5" /> GAME DIRECTORY
          </div>
          <h1 className="text-3xl font-black text-white">
            Esports <span className="brand-text">Games & Categories</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure supported titles, categories, and banners.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin">
            <Button variant="ghost" icon={<Shield className="w-4 h-4" />}>
              Admin Panel
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Add Game Title
          </Button>
        </div>
      </div>

      {/* Games List */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Games ({games.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-gray-400 font-bold">No game titles found.</p>
              <Button variant="primary" size="sm" onClick={openCreateModal}>Add First Game</Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {games.map((g: Game) => (
                <div
                  key={g.id}
                  className={cn(
                    'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/[0.02]',
                    !g.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon or Banner */}
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-white/10 flex items-center justify-center shrink-0 text-2xl overflow-hidden">
                      {g.banner_url ? (
                        /* eslint-disable-next-html-extension/no-img-element */
                        <img src={g.banner_url} alt={g.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{g.icon_url || '🎮'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-white text-base">{g.name}</h3>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-300 bg-purple-500/10">
                          {g.category || 'Sports'}
                        </span>
                        {!g.is_active && (
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20">
                            Disabled
                          </span>
                        )}
                      </div>
                      {g.publisher && (
                        <p className="text-xs text-gray-400 mt-0.5">Publisher: {g.publisher}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActiveMut.mutate(g)}
                      title={g.is_active ? 'Disable' : 'Enable'}
                    >
                      {g.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(g)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        if (confirm(`Delete game title "${g.name}"?`)) deleteMut.mutate(g.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editGame ? 'Edit Game Title' : 'Add Game Title'}
          open={modalOpen}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <Input
              label="Game Title Name *"
              placeholder="e.g. Valorant, Tekken 8"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Category / Genre</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="input w-full"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-gaming-dark">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Publisher / Developer (optional)"
              placeholder="e.g. Riot Games, Konami"
              value={publisher}
              onChange={e => setPublisher(e.target.value)}
            />

            <Input
              label="Icon / Emoji"
              placeholder="e.g. ⚽ or ⚽"
              value={iconUrl}
              onChange={e => setIconUrl(e.target.value)}
            />

            <Input
              label="Banner Image URL (optional)"
              placeholder="https://images.unsplash.com/..."
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
            />

            <Input
              label="Brand Theme Color (HEX)"
              placeholder="#8B5CF6"
              value={color}
              onChange={e => setColor(e.target.value)}
            />

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => editGame ? updateMut.mutate() : createMut.mutate()}
                disabled={createMut.isPending || updateMut.isPending || !name.trim()}
              >
                {createMut.isPending || updateMut.isPending ? 'Saving…' : editGame ? 'Save Changes' : 'Create Game'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
