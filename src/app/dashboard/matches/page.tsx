'use client';

import React, { useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyMatches } from '@/lib/bracket/engine';
import { reportMatchResult } from '@/lib/actions/match-actions';
import { ReportResultModal } from '@/components/modals/ReportResultModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Swords, Flag } from 'lucide-react';
import Link from 'next/link';
import type { Match } from '@/lib/types/database';

export default function MatchCenterPage() {
  const { profile: user } = useAuth();
  const queryClient = useQueryClient();

  const [reportMatch, setReportMatch] = useState<Match | null>(null);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['my-matches', user?.id],
    queryFn: () => fetchMyMatches(user!.id),
    enabled: !!user?.id,
  });

  const reportMut = useMutation({
    mutationFn: ({ matchId, scoreA, scoreB, screenshotUrl }: {
      matchId: string;
      scoreA: number;
      scoreB: number;
      screenshotUrl: string;
    }) => reportMatchResult(matchId, scoreA, scoreB, screenshotUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-matches', user?.id] });
      setReportMatch(null);
    },
  });

  const pendingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'pending_review');
  const completedMatches = matches.filter(m => m.status === 'confirmed');

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-6">
        <h1 className="text-3xl font-black text-white">Match <span className="brand-text">Center</span></h1>

        <Card>
          <CardHeader><CardTitle>Pending Match Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl bg-surface-2 border border-white/10">
                  <Skeleton className="h-3 w-32 mb-3" />
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))
            ) : pendingMatches.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No pending matches. Check back after joining a tournament!</p>
            ) : (
              pendingMatches.map(m => {
                const playerA = m.player_a?.profile;
                const playerB = m.player_b?.profile;
                const tournamentName = (m as any).tournament?.name;

                return (
                  <div key={m.id} className="p-6 rounded-2xl bg-surface-2 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{m.round_name} • Match #{m.id.slice(-4)}</span>
                      <Badge variant={m.status === 'pending_review' ? 'registration' : 'player'}>
                        {m.status === 'pending_review' ? 'PENDING REVIEW' : 'AWAITING SUBMISSION'}
                      </Badge>
                    </div>
                    {tournamentName && (
                      <p className="text-xs text-primary-400 font-bold">{tournamentName}</p>
                    )}
                    <div className="flex items-center justify-between text-base font-bold text-white">
                      <span>{playerA?.username || 'TBD'}</span>
                      <span className="text-sm font-mono text-gray-400">VS</span>
                      <span>{playerB?.username || 'TBD'}</span>
                    </div>
                    {m.score_a !== null && m.score_b !== null && (
                      <div className="text-center text-sm text-gray-400">
                        Score: <span className="text-white font-mono font-bold">{m.score_a} - {m.score_b}</span>
                      </div>
                    )}
                    {m.status === 'scheduled' && (
                      <button
                        onClick={() => setReportMatch(m)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                      >
                        <Flag className="w-3.5 h-3.5" /> Report Result
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {completedMatches.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recent Results</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {completedMatches.slice(0, 5).map(m => {
                const playerA = m.player_a?.profile;
                const playerB = m.player_b?.profile;
                const won = m.winner?.player_id === user?.id;

                return (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/10">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {playerA?.username || 'TBD'} vs {playerB?.username || 'TBD'}
                      </p>
                      <p className="text-xs text-gray-400">{m.round_name} • Score: {m.score_a}-{m.score_b}</p>
                    </div>
                    <Badge variant={won ? 'verified' : 'player'}>
                      {won ? 'WON' : 'LOST'}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>

      {reportMatch && user && (
        <ReportResultModal
          match={reportMatch}
          currentUser={user}
          onClose={() => setReportMatch(null)}
          onSubmit={(scoreA, scoreB, screenshotUrl) =>
            reportMut.mutateAsync({ matchId: reportMatch.id, scoreA, scoreB, screenshotUrl })
          }
        />
      )}
    </div>
  );
}
