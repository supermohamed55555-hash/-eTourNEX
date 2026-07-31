'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, ChevronLeft, Zap, CheckCircle2, AlertCircle, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTournamentById, fetchMatches, fetchParticipants } from '@/lib/bracket/engine';
import { generateBracket } from '@/lib/actions/admin-actions';
import { confirmMatch } from '@/lib/actions/match-actions';
import { Skeleton } from '@/components/ui/Skeleton';
import { SingleEliminationBracket } from '@/components/bracket/SingleEliminationBracket';
import { ConfirmResultModal } from '@/components/modals/ConfirmResultModal';

export default function AdminBracketPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: loadingT } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => fetchTournamentById(tournamentId),
  });

  const { data: matches = [], isLoading: loadingM } = useQuery({
    queryKey: ['matches', tournamentId],
    queryFn: () => fetchMatches(tournamentId),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', tournamentId],
    queryFn: () => fetchParticipants(tournamentId),
  });

  const [confirmMatchData, setConfirmMatchData] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generateMut = useMutation({
    mutationFn: () => generateBracket(tournamentId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Bracket generated successfully! All matches have been created.' });
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['participants', tournamentId] });
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message || 'Failed to generate bracket.' }),
  });

  const confirmMut = useMutation({
    mutationFn: (matchId: string) => confirmMatch(matchId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Match confirmed! Winner has been advanced.' });
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['participants', tournamentId] });
      setConfirmMatchData(null);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  if (loadingT) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!tournament) {
    return <div className="text-center py-20 text-gray-400">Tournament not found.</div>;
  }

  const pendingCount = matches.filter(m => m.status === 'pending_review').length;
  const confirmedCount = matches.filter(m => m.status === 'confirmed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/tournaments" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Bracket Manager</h1>
            <p className="text-sm text-gray-400">{tournament.name}</p>
          </div>
        </div>

        {/* Generate Bracket Button */}
        {tournament.status === 'registration' && participants.length >= 2 && (
          <button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-neon to-emerald-500 text-gaming-dark font-extrabold text-sm shadow-neon hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-5 h-5" />
            {generateMut.isPending ? 'Generating...' : `Generate Bracket (${participants.length} Players)`}
          </button>
        )}

        {tournament.status === 'registration' && participants.length < 2 && (
          <div className="text-sm text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Need at least 2 participants
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/30 text-accent-neon' : 'bg-red-950/50 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Bracket Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Participants', value: participants.length, color: 'text-primary-400' },
          { label: 'Total Matches', value: matches.length, color: 'text-secondary-500' },
          { label: 'Pending Review', value: pendingCount, color: pendingCount > 0 ? 'text-amber-400' : 'text-gray-400' },
          { label: 'Confirmed', value: confirmedCount, color: 'text-accent-neon' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-2xl p-4 border border-white/10 text-center">
            <div className={`text-2xl font-extrabold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bracket Visual */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary-400" />
          Single Elimination Bracket
        </h2>
        <SingleEliminationBracket
          matches={matches}
          participants={participants}
          currentUser={currentUser}
          onConfirmMatch={m => setConfirmMatchData(m)}
        />
      </div>

      {/* Participants List */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
          <Users className="w-5 h-5 text-secondary-500" />
          Registered Participants ({participants.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {participants.map(p => (
            <div key={p.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <img
                src={p.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.player_id}`}
                alt={p.profile?.username}
                className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.profile?.display_name || p.profile?.username}</p>
                <p className="text-xs text-gray-400">Seed #{p.seed || '-'}</p>
                {p.eliminated && <p className="text-[10px] text-red-400 font-bold">ELIMINATED</p>}
              </div>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="col-span-full text-center text-gray-400 text-sm py-4">No participants registered yet.</p>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmMatchData && currentUser && (
        <ConfirmResultModal
          match={confirmMatchData}
          adminUser={currentUser}
          onClose={() => setConfirmMatchData(null)}
          onConfirm={() => confirmMut.mutateAsync(confirmMatchData.id)}
        />
      )}
    </div>
  );
}
