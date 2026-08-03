'use client';

import React, { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTournamentById, fetchMatches, fetchParticipants } from '@/lib/bracket/engine';
import { joinTournament, leaveTournament } from '@/lib/actions/tournament-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PlayerBadges } from '@/components/gaming/PlayerBadges';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import BracketFlow from '@/components/bracket/BracketFlow';
import { Trophy, Calendar, Users, DollarSign, Info, FileText, CheckCircle2, LogOut } from 'lucide-react';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: loadingT } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournamentById(id),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', id],
    queryFn: () => fetchMatches(id),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => fetchParticipants(id),
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'bracket' | 'participants' | 'discussion' | 'rules'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const joinMutation = useMutation({
    mutationFn: () => joinTournament(id),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Successfully registered for tournament!' });
      queryClient.invalidateQueries({ queryKey: ['participants', id] });
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.message || 'Failed to join tournament.' });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveTournament(id),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'You have left the tournament.' });
      queryClient.invalidateQueries({ queryKey: ['participants', id] });
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.message || 'Failed to leave tournament.' });
    },
  });

  if (loadingT) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!tournament) notFound();

  const isJoined = participants.some(p => p.player_id === currentUser?.id);
  const isFull   = (tournament.participants_count ?? 0) >= (tournament.max_players ?? 32);
  const prizeNum = Number(tournament.prize_pool) || 0;

  const handleJoin = () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Please login first.' });
      return;
    }
    if (!currentUser.email_confirmed) {
      setMessage({ type: 'error', text: 'Please verify your email address to join tournaments!' });
      return;
    }
    joinMutation.mutate();
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/30 text-accent-neon' : 'bg-red-950/50 border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-white/10">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={tournament.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80'}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/60 to-transparent" />
        </div>

        <div className="p-6 sm:p-8 relative -mt-20 z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={tournament.status === 'registration' ? 'registration' : 'in-progress'}>
                {tournament.status.replace('_', ' ')}
              </Badge>
              <Badge variant="player">{tournament.game?.name ?? 'eFootball 2025'}</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{tournament.name}</h1>
            <div className="flex items-center gap-6 text-xs sm:text-sm text-gray-400 flex-wrap">
              {tournament.starts_at && (
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary-400" /> {new Date(tournament.starts_at).toLocaleDateString()}</span>
              )}
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-secondary-400" /> {tournament.participants_count ?? 0}/{tournament.max_players ?? 32}</span>
              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-amber-400" /> ${prizeNum} Pool</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isJoined ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button variant="secondary" className="cursor-default" icon={<CheckCircle2 className="w-4 h-4 text-accent-neon" />}>
                  Registered
                </Button>
                {tournament.status === 'registration' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    icon={<LogOut className="w-4 h-4" />}
                  >
                    Leave
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={isFull || tournament.status !== 'registration' || joinMutation.isPending}
                onClick={handleJoin}
                className="w-full md:w-auto"
              >
                {joinMutation.isPending ? 'Joining...' : isFull ? 'Tournament Full' : 'Register Slot Now'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {(['overview', 'bracket', 'participants', 'discussion', 'rules'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-item ${activeTab === tab ? 'active' : ''}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Info className="w-5 h-5 text-primary-400" /> Description</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{tournament.description || 'Compete in this official tournament. Check the rules, ensure your result screenshots are ready after each match.'}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Prize Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm font-bold text-amber-300">🥇 1st Place</span>
                <span className="font-mono text-sm font-bold text-white">${Math.round(prizeNum * 0.6)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
                <span className="text-sm font-bold text-slate-300">🥈 2nd Place</span>
                <span className="font-mono text-sm font-bold text-white">${Math.round(prizeNum * 0.3)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-amber-900/10 border border-amber-900/20">
                <span className="text-sm font-bold text-amber-600">🥉 3rd Place</span>
                <span className="font-mono text-sm font-bold text-white">${Math.round(prizeNum * 0.1)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bracket' && <BracketFlow matches={matches} />}

      {activeTab === 'participants' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {participants.length === 0 ? (
            <div className="col-span-4 text-center py-12 text-gray-500 text-sm">No participants registered yet.</div>
          ) : participants.map((p, i) => (
            <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-3">
                <Avatar src={p.profile?.avatar_url} alt={p.profile?.username} size="sm" seed={p.profile?.username} />
                <div>
                  <p className="font-bold text-white text-sm">{p.profile?.username ?? 'Unknown'}</p>
                  <span className="text-[10px] text-gray-400">Seed #{i + 1}</span>
                </div>
              </div>
              <PlayerBadges
                emailConfirmed={p.profile?.email_confirmed}
                role={p.profile?.role}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'discussion' && (
        <TournamentCommentsSection tournamentId={tournament.id} />
      )}

      {activeTab === 'rules' && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-secondary-400" /> Official Rules</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{tournament.rules || 'Standard tournament rules apply. Both players must submit a screenshot proof within 15 minutes of match completion. Disputes are reviewed by the admin team.'}</p>
        </div>
      )}

    </div>
  );
}

import { CommentSection } from '@/components/community/CommentSection';
import {
  fetchTournamentComments, addTournamentComment, deleteTournamentComment,
  getTournamentLikes, toggleTournamentLike
} from '@/lib/actions/community-actions';

function TournamentCommentsSection({ tournamentId }: { tournamentId: string }) {
  const { profile: user } = useAuth();
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['tournament-comments', tournamentId],
    queryFn: () => fetchTournamentComments(tournamentId),
  });

  const { data: likesData = { count: 0, hasLiked: false } } = useQuery({
    queryKey: ['tournament-likes', tournamentId, user?.id],
    queryFn: () => getTournamentLikes(tournamentId, user?.id),
  });

  const handleAdd = async (content: string, parentId?: string) => {
    await addTournamentComment(tournamentId, content, parentId);
    qc.invalidateQueries({ queryKey: ['tournament-comments', tournamentId] });
  };

  const handleDelete = async (commentId: string) => {
    await deleteTournamentComment(commentId);
    qc.invalidateQueries({ queryKey: ['tournament-comments', tournamentId] });
  };

  const handleToggleLike = async () => {
    await toggleTournamentLike(tournamentId);
    qc.invalidateQueries({ queryKey: ['tournament-likes', tournamentId] });
  };

  return (
    <CommentSection
      comments={comments}
      onAddComment={handleAdd}
      onDeleteComment={handleDelete}
      onToggleLike={handleToggleLike}
      likesCount={likesData.count}
      hasLiked={likesData.hasLiked}
      title="Tournament Discussion & Community Posts"
      loading={isLoading}
    />
  );
}

