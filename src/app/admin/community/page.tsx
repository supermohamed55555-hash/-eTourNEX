'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { notFound } from 'next/navigation';
import { fetchCommunityClips, deleteCommunityClip } from '@/lib/actions/community-actions';
import type { CommunityClip } from '@/lib/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import {
  Film, Trash2, ExternalLink, Heart, Shield, Eye
} from 'lucide-react';
import Link from 'next/link';

export default function AdminCommunityPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['admin-community-clips'],
    queryFn: () => fetchCommunityClips('all'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCommunityClip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-clips'] });
      queryClient.invalidateQueries({ queryKey: ['community-clips'] });
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold mb-2">
            <Film className="w-3.5 h-3.5" /> MEDIA MODERATION
          </div>
          <h1 className="text-3xl font-black text-white">
            Community <span className="brand-text">Clips Moderation</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Review, feature, or remove community submitted highlights.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/community" target="_blank">
            <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>
              View Live Hub
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" icon={<Shield className="w-4 h-4" />}>
              Admin Panel
            </Button>
          </Link>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Clips ({clips.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : clips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 font-bold">
              No community clips submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {clips.map((c: CommunityClip) => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded-xl bg-surface-2 border border-white/10 overflow-hidden shrink-0">
                      {/* eslint-disable-next-html-extension/no-img-element */}
                      <img src={c.thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'} alt={c.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{c.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="capitalize text-rose-400 font-bold">{c.category}</span>
                        <span>❤️ {c.likes_count} likes</span>
                        {c.player && <span>By @{c.player.username}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a href={c.video_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Watch
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        if (confirm(`Remove clip "${c.title}"?`)) deleteMut.mutate(c.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
