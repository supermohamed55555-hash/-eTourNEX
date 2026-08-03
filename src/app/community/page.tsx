'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import {
  fetchCommunityClips, postCommunityClip, toggleLikeCommunityClip
} from '@/lib/actions/community-actions';
import { fetchGames } from '@/lib/bracket/engine';
import type { CommunityClip, ClipCategory, Game } from '@/lib/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Heart, Play, Plus, Film, Sparkles, Flame, Shield,
  Share2, ExternalLink, X, Gamepad2, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_TABS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all',       label: 'All Clips',  icon: Film },
  { id: 'highlight', label: 'Highlights', icon: Flame },
  { id: 'clutch',    label: 'Clutches',   icon: Sparkles },
  { id: 'guide',     label: 'Guides',     icon: Award },
  { id: 'funny',     label: 'Funny',      icon: Gamepad2 },
];

export default function CommunityPage() {
  const { profile: user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [postModalOpen, setPostModalOpen]       = useState(false);
  const [activeVideo, setActiveVideo]           = useState<CommunityClip | null>(null);

  // Form State
  const [title, setTitle]       = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState<ClipCategory>('highlight');
  const [gameId, setGameId]     = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['community-clips', selectedCategory],
    queryFn: () => fetchCommunityClips(selectedCategory),
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  });

  const postMut = useMutation({
    mutationFn: () =>
      postCommunityClip({
        title,
        video_url: videoUrl,
        category,
        game_id: gameId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-clips'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message || 'Failed to submit clip.'),
  });

  const likeMut = useMutation({
    mutationFn: (clipId: string) => toggleLikeCommunityClip(clipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-clips'] });
    },
  });

  const closeModal = () => {
    setPostModalOpen(false);
    setTitle('');
    setVideoUrl('');
    setCategory('highlight');
    setGameId('');
    setFormError(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 sm:p-12 border border-white/10">
        <div className="absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <Film className="w-3.5 h-3.5" /> COMMUNITY & MEDIA HUB
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Highlights & <span className="brand-text">Media</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Watch insane match clutches, tournament highlights, and community video guides shared by players.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!user) {
                alert('Please sign in to share your highlight clip.');
                return;
              }
              if (games.length > 0) setGameId(games[0].id);
              setPostModalOpen(true);
            }}
          >
            Submit Highlight Clip
          </Button>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 border',
              selectedCategory === tab.id
                ? 'bg-rose-600/30 border-rose-500/50 text-white shadow-purple-glow-sm'
                : 'glass text-gray-400 hover:text-white border-white/5 hover:border-white/15'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}
        </div>
      )}

      {/* ── Clips Grid ── */}
      {!isLoading && (
        <div>
          {clips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.map((clip: CommunityClip) => {
                const player = clip.player;
                const game   = clip.game;
                const liked  = clip.user_has_liked;

                return (
                  <div
                    key={clip.id}
                    className="glass-card rounded-3xl border border-white/10 overflow-hidden group card-hover flex flex-col justify-between"
                  >
                    {/* Thumbnail & Play Overlay */}
                    <div
                      onClick={() => setActiveVideo(clip)}
                      className="h-48 relative overflow-hidden bg-surface-2 cursor-pointer group-hover:opacity-95 transition-opacity"
                    >
                      {/* eslint-disable-next-html-extension/no-img-element */}
                      <img
                        src={clip.thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-all">
                        <div className="w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 ml-0.5" />
                        </div>
                      </div>

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-rose-500/30 text-rose-300 bg-rose-500/20 backdrop-blur-md">
                        {clip.category}
                      </span>

                      {game && (
                        <span className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-gray-300 backdrop-blur-md">
                          {game.name}
                        </span>
                      )}
                    </div>

                    {/* Clip Body */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <h3
                        onClick={() => setActiveVideo(clip)}
                        className="font-bold text-white text-base line-clamp-2 cursor-pointer hover:text-rose-400 transition-colors"
                      >
                        {clip.title}
                      </h3>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        {player ? (
                          <Link href={`/players/${player.username}`} className="flex items-center gap-2 group/user">
                            <Avatar
                              src={player.avatar_url}
                              alt={player.username}
                              seed={player.username}
                              size="xs"
                            />
                            <span className="text-xs text-gray-300 font-semibold group-hover/user:text-primary-400 transition-colors">
                              @{player.username}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500">Player</span>
                        )}

                        {/* Like Button */}
                        <button
                          onClick={() => {
                            if (!user) {
                              alert('Please sign in to like clips.');
                              return;
                            }
                            likeMut.mutate(clip.id);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border',
                            liked
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                          )}
                        >
                          <Heart className={cn('w-3.5 h-3.5', liked && 'fill-rose-500 text-rose-500')} />
                          {clip.likes_count}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 glass-card rounded-3xl border border-white/5 space-y-3">
              <Film className="w-10 h-10 mx-auto text-gray-600" />
              <h3 className="text-xl font-bold text-white">No Clips Found</h3>
              <p className="text-gray-400 text-sm">Be the first to submit a highlight clip!</p>
            </div>
          )}
        </div>
      )}

      {/* ── Submit Clip Modal ── */}
      {postModalOpen && (
        <Modal
          title="Submit Highlight Clip"
          open={postModalOpen}
          onClose={closeModal}
        >
          <form onSubmit={e => { e.preventDefault(); postMut.mutate(); }} className="space-y-4">
            <Input
              label="Clip Title *"
              placeholder="e.g. Insane 1v4 Clutch in Season Finals!"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <Input
              label="Video URL (YouTube or Twitch clip) *"
              placeholder="https://www.youtube.com/watch?v=..."
              required
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ClipCategory)}
                  className="input w-full"
                >
                  <option value="highlight">Highlight</option>
                  <option value="clutch">Clutch</option>
                  <option value="guide">Guide & Tutorial</option>
                  <option value="funny">Funny Moment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Game Title</label>
                <select
                  value={gameId}
                  onChange={e => setGameId(e.target.value)}
                  className="input w-full"
                >
                  {games.map((g: Game) => (
                    <option key={g.id} value={g.id} className="bg-gaming-dark">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {formError}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                disabled={postMut.isPending || !title.trim() || !videoUrl.trim()}
              >
                {postMut.isPending ? 'Submitting…' : 'Publish Clip'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Video Player Modal ── */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl border border-white/10 p-6 w-full max-w-3xl space-y-4 relative">
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white pr-10">{activeVideo.title}</h3>

            {/* Video iFrame / Embed */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10">
              {activeVideo.video_url.includes('youtube.com') || activeVideo.video_url.includes('youtu.be') ? (
                <iframe
                  src={activeVideo.video_url
                    .replace('watch?v=', 'embed/')
                    .replace('youtu.be/', 'youtube.com/embed/')}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-3 p-6 text-center">
                  <Film className="w-12 h-12 text-rose-400" />
                  <p className="text-sm text-gray-300">Direct Video Preview</p>
                  <a
                    href={activeVideo.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:underline"
                  >
                    Open Original Video Source <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
              <span>Category: {activeVideo.category}</span>
              <a
                href={activeVideo.video_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Open Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
