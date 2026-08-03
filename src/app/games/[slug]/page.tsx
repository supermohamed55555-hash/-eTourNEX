'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug, fetchTournamentsByGame } from '@/lib/bracket/engine';
import TournamentCard from '@/components/gaming/TournamentCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import {
  Gamepad2, Trophy, ArrowLeft, Plus, Globe, Shield, Swords
} from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { profile: user } = useAuth();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
  });

  const { data: tournaments = [], isLoading: tourneysLoading } = useQuery({
    queryKey: ['game-tournaments', game?.id],
    queryFn: () => (game ? fetchTournamentsByGame(game.id) : Promise.resolve([])),
    enabled: !!game,
  });

  if (gameLoading) {
    return (
      <div className="min-h-screen py-10 px-4 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <Gamepad2 className="w-16 h-16 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-400">Game not found</h2>
        <Link href="/games"><Button variant="secondary">Back to Games</Button></Link>
      </div>
    );
  }

  const activeTournaments = tournaments.filter((t: any) => t.status === 'registration' || t.status === 'in_progress');

  return (
    <div className="min-h-screen pb-16">
      {/* Banner Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden bg-gradient-to-br from-primary-900 to-secondary-900">
        {game.banner_url ? (
          <img src={game.banner_url} alt={game.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 opacity-40 bg-gradient-to-br" style={{ backgroundColor: game.color || '#8B5CF6' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-black/40 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link href="/games" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass text-xs font-semibold text-gray-300 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" /> All Games
          </Link>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-2 border-2 border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl shrink-0"
              style={game.color ? { borderColor: game.color } : {}}
            >
              {game.icon_url || '🎮'}
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary-500/20 text-primary-300 border border-primary-500/30">
                {game.category || 'Esports'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">{game.name}</h1>
              {game.publisher && (
                <p className="text-xs text-gray-400">Published by {game.publisher}</p>
              )}
            </div>
          </div>

          {(user?.role === 'organizer' || user?.role === 'admin') && (
            <Button
              onClick={() => router.push(`/dashboard/tournaments/new?gameId=${game.id}`)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create {game.name} Tournament
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-white">{tournaments.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Tournaments</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-accent-neon">{activeTournaments.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active / Open</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-accent-amber">{game.category || 'Esports'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Genre</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-primary-400">Official</p>
            <p className="text-xs text-gray-500 mt-0.5">Supported Title</p>
          </div>
        </div>

        {/* Tournaments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent-amber" />
              {game.name} Tournaments
            </h2>
            <span className="text-xs text-gray-400">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</span>
          </div>

          {tourneysLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl space-y-3">
              <Swords className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-lg font-bold text-gray-400">No tournaments for {game.name} yet</h3>
              <p className="text-gray-600 text-xs">Organizers will add new tournaments soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((t: any) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
