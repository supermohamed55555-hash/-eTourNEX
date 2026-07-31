'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ChevronLeft, CheckCircle2, Clock, Image as ImageIcon, AlertCircle, Trophy, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPendingReviews } from '@/lib/bracket/engine';
import { confirmMatch, rejectMatch } from '@/lib/actions/match-actions';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmResultModal } from '@/components/modals/ConfirmResultModal';

export default function AdminResultsPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingData = [], isLoading } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: fetchPendingReviews,
  });

  // Map to expected shape
  const pendingMatches = pendingData.map(m => ({
    match: m,
    tournament: (m as any).tournament ?? null,
  }));

  const [confirmMatchData, setConfirmMatchData] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const confirmMut = useMutation({
    mutationFn: (matchId: string) => confirmMatch(matchId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Match confirmed! Winner advanced to next round.' });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      setConfirmMatchData(null);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const rejectMut = useMutation({
    mutationFn: (matchId: string) => rejectMatch(matchId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Match rejected. Players can re-submit results.' });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="text-center py-20 text-gray-400">Admin access required.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <Clock className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Result Review Queue</h1>
          <p className="text-xs text-gray-400">{pendingMatches.length} match{pendingMatches.length !== 1 ? 'es' : ''} awaiting review</p>
        </div>
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

      {/* Pending Matches */}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 border border-white/10">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-20 w-full mb-3" />
              <Skeleton className="h-10 w-48" />
            </div>
          ))}
        </div>
      ) : pendingMatches.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center border border-white/10">
          <CheckCircle2 className="w-12 h-12 text-accent-neon mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
          <p className="text-gray-400 text-sm">No matches pending review. All submitted results have been confirmed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingMatches.map(({ match, tournament }) => {
            const playerA = match.player_a?.profile;
            const playerB = match.player_b?.profile;
            const scoreA = match.score_a ?? 0;
            const scoreB = match.score_b ?? 0;
            const projectedWinner = scoreA > scoreB ? playerA : playerB;

            return (
              <div key={match.id} className="glass-card rounded-3xl p-6 border border-amber-500/30 bg-amber-950/5">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Match Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-900/30 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Pending Review
                        </span>
                        <p className="text-base font-bold text-white mt-2">{tournament?.name}</p>
                        <p className="text-xs text-gray-400">{match.round_name} • Match #{match.id.slice(-6)}</p>
                      </div>
                    </div>

                    {/* Players & Scores */}
                    <div className="glass-panel rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <img src={playerA?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${playerA?.username}`} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                          <div>
                            <p className="text-sm font-bold text-white">{playerA?.display_name || playerA?.username}</p>
                            <p className="text-xs text-gray-400">@{playerA?.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-3xl font-extrabold font-mono ${scoreA > scoreB ? 'text-accent-neon' : 'text-red-400'}`}>{scoreA}</span>
                          <span className="text-gray-500 font-bold">:</span>
                          <span className={`text-3xl font-extrabold font-mono ${scoreB > scoreA ? 'text-accent-neon' : 'text-red-400'}`}>{scoreB}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <img src={playerB?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${playerB?.username}`} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">{playerB?.display_name || playerB?.username}</p>
                            <p className="text-xs text-gray-400">@{playerB?.username}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400 flex items-center justify-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-accent-neon" />
                        Projected winner: <strong className="text-accent-neon">{projectedWinner?.display_name || projectedWinner?.username}</strong>
                      </div>
                    </div>

                    {/* Reporter Info */}
                    {match.reporter && (
                      <p className="text-xs text-gray-400">
                        Reported by: <strong className="text-white">@{match.reporter.username}</strong>
                      </p>
                    )}
                  </div>

                  {/* Screenshot Proof & Actions */}
                  <div className="sm:w-64 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-primary-400" /> Proof Screenshot
                      </h4>
                      {match.proof_screenshot_url ? (
                        <a href={match.proof_screenshot_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={match.proof_screenshot_url}
                            alt="Proof"
                            className="w-full h-36 object-cover rounded-xl border border-white/10 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-36 rounded-xl border border-red-500/30 bg-red-950/20 flex items-center justify-center text-red-400 text-xs">
                          No proof attached
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setConfirmMatchData(match)}
                      className="w-full py-3 rounded-xl bg-accent-neon hover:bg-emerald-400 text-gaming-dark font-extrabold text-sm shadow-neon transition-all flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" /> Review & Confirm
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(match.id)}
                      disabled={rejectMut.isPending}
                      className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject Result
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
