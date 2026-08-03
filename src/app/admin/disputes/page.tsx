'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { notFound } from 'next/navigation';
import { fetchDisputes } from '@/lib/bracket/engine';
import { resolveDispute } from '@/lib/actions/match-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import {
  AlertTriangle, CheckCircle2, XCircle, Shield, Clock,
  Swords, ChevronRight, Trophy, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type FilterStatus = 'all' | 'open' | 'resolved' | 'dismissed';

const STATUS_STYLES: Record<string, string> = {
  open:      'text-amber-400 bg-amber-500/10 border-amber-500/30',
  resolved:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  dismissed: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open:      <Clock className="w-3.5 h-3.5" />,
  resolved:  <CheckCircle2 className="w-3.5 h-3.5" />,
  dismissed: <XCircle className="w-3.5 h-3.5" />,
};

export default function AdminDisputesPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter]               = useState<FilterStatus>('all');
  const [resolveModal, setResolveModal]   = useState<{ dispute: any } | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [adminNotes, setAdminNotes]       = useState('');
  const [resolution, setResolution]       = useState<'resolved' | 'dismissed'>('resolved');
  const [actionError, setActionError]     = useState<string | null>(null);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => fetchDisputes(),
    refetchInterval: 30000, // refresh every 30s
  });

  const resolveMut = useMutation({
    mutationFn: () =>
      resolveDispute(
        resolveModal!.dispute.id,
        resolution,
        resolution === 'resolved' ? selectedWinner : null,
        adminNotes
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      setResolveModal(null);
      setSelectedWinner('');
      setAdminNotes('');
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to resolve dispute.');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  // Filter disputes client-side
  const filtered = filter === 'all'
    ? disputes
    : disputes.filter((d: any) => d.status === filter);

  const openCount     = disputes.filter((d: any) => d.status === 'open').length;
  const resolvedCount = disputes.filter((d: any) => d.status === 'resolved').length;

  const openModal = (dispute: any) => {
    setResolveModal({ dispute });
    setSelectedWinner('');
    setAdminNotes('');
    setResolution('resolved');
    setActionError(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> DISPUTE MANAGEMENT
          </div>
          <h1 className="text-3xl font-black text-white">
            Match <span className="brand-text">Disputes</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Review and resolve contested match results.</p>
        </div>
        <Link href="/admin">
          <Button variant="ghost" icon={<Shield className="w-4 h-4" />}>
            Admin Panel
          </Button>
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 text-center">
          <p className="text-2xl font-black text-amber-400">{openCount}</p>
          <p className="text-xs text-gray-400 mt-1">Open Disputes</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 text-center">
          <p className="text-2xl font-black text-emerald-400">{resolvedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Resolved</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
          <p className="text-2xl font-black text-white">{disputes.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total</p>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'open', 'resolved', 'dismissed'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize',
              filter === f
                ? 'bg-primary-600/20 border border-primary-500/40 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            {f}
            {f === 'open' && openCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-10 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-surface-2 border border-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <p className="text-white font-semibold">No {filter === 'all' ? '' : filter} disputes</p>
          <p className="text-gray-500 text-sm">
            {filter === 'open' ? 'All disputes have been resolved. ✅' : 'Nothing to show here.'}
          </p>
        </div>
      )}

      {/* ── Disputes List ── */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((dispute: any) => {
            const match    = dispute.match;
            const playerA  = match?.player_a?.profile;
            const playerB  = match?.player_b?.profile;
            const reporter = dispute.reporter;
            const isOpen   = dispute.status === 'open';

            return (
              <div
                key={dispute.id}
                className={cn(
                  'glass-card rounded-2xl p-5 border transition-all',
                  isOpen ? 'border-amber-500/20' : 'border-white/5'
                )}
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      isOpen ? 'bg-amber-500/10' : 'bg-white/5'
                    )}>
                      <AlertTriangle className={cn('w-5 h-5', isOpen ? 'text-amber-400' : 'text-gray-500')} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          Dispute #{dispute.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border capitalize',
                          STATUS_STYLES[dispute.status]
                        )}>
                          {STATUS_ICONS[dispute.status]}
                          {dispute.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(dispute.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {isOpen && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Shield className="w-3.5 h-3.5" />}
                      onClick={() => openModal(dispute)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>

                {/* Match Info */}
                {match && (
                  <div className="mb-4 p-3 rounded-xl bg-surface-2 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Swords className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-400 font-semibold">{match.round_name || 'Match'}</span>
                      <span className="text-xs text-gray-600">
                        Score: {match.score_a ?? '?'} — {match.score_b ?? '?'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {playerA && (
                        <div className="flex items-center gap-2">
                          <Avatar src={playerA.avatar_url} alt={playerA.username} seed={playerA.username} size="xs" />
                          <span className="text-xs text-white font-semibold">{playerA.username}</span>
                        </div>
                      )}
                      <span className="text-gray-600 text-xs font-bold">vs</span>
                      {playerB && (
                        <div className="flex items-center gap-2">
                          <Avatar src={playerB.avatar_url} alt={playerB.username} seed={playerB.username} size="xs" />
                          <span className="text-xs text-white font-semibold">{playerB.username}</span>
                        </div>
                      )}
                      {match.tournament_id && (
                        <Link
                          href={`/tournaments/${match.tournament_id}`}
                          className="ml-auto text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                        >
                          View Tournament <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Dispute Reason */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">Reason</p>
                  <p className="text-sm text-gray-200 bg-surface-2 rounded-xl p-3 border border-white/5">
                    {dispute.reason}
                  </p>
                </div>

                {/* Reporter */}
                {reporter && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Reported by</span>
                    <Avatar src={reporter.avatar_url} alt={reporter.username} seed={reporter.username} size="xs" />
                    <Link href={`/players/${reporter.username}`} className="text-primary-400 hover:underline">
                      @{reporter.username}
                    </Link>
                  </div>
                )}

                {/* Admin Notes (if resolved) */}
                {!isOpen && dispute.admin_notes && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-semibold mb-1">Admin Notes</p>
                    <p className="text-xs text-gray-300">{dispute.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {resolveModal && (
        <Modal
          title="Resolve Dispute"
          open={!!resolveModal}
          onClose={() => { setResolveModal(null); setActionError(null); }}
        >
          <div className="space-y-5">
            {/* Match info */}
            {resolveModal.dispute.match && (
              <div className="p-3 rounded-xl bg-surface-2 border border-white/10 text-sm">
                <p className="text-gray-400 text-xs mb-2 font-semibold">MATCH</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const pA = resolveModal.dispute.match.player_a?.profile;
                    const pB = resolveModal.dispute.match.player_b?.profile;
                    const pAId = resolveModal.dispute.match.player_a?.id;
                    const pBId = resolveModal.dispute.match.player_b?.id;
                    return (
                      <>
                        {pA && <span className="text-white font-bold">{pA.username}</span>}
                        <span className="text-gray-500">vs</span>
                        {pB && <span className="text-white font-bold">{pB.username}</span>}
                        <span className="ml-auto text-gray-400">
                          {resolveModal.dispute.match.score_a} — {resolveModal.dispute.match.score_b}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Resolution Type */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Resolution</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setResolution('resolved')}
                  className={cn(
                    'p-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2',
                    resolution === 'resolved'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" /> Resolve with Winner
                </button>
                <button
                  onClick={() => setResolution('dismissed')}
                  className={cn(
                    'p-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2',
                    resolution === 'dismissed'
                      ? 'border-gray-500/50 bg-gray-500/10 text-gray-300'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  )}
                >
                  <XCircle className="w-4 h-4" /> Dismiss & Re-play
                </button>
              </div>
            </div>

            {/* Winner Selection (only for resolved) */}
            {resolution === 'resolved' && (() => {
              const pA = resolveModal.dispute.match?.player_a;
              const pB = resolveModal.dispute.match?.player_b;
              return (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Select Winner</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[pA, pB].filter(Boolean).map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedWinner(p.id)}
                        className={cn(
                          'p-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2',
                          selectedWinner === p.id
                            ? 'border-primary-500/50 bg-primary-500/10 text-white'
                            : 'border-white/10 text-gray-400 hover:border-white/20'
                        )}
                      >
                        <Trophy className={cn('w-4 h-4', selectedWinner === p.id ? 'text-amber-400' : 'text-gray-600')} />
                        {p.profile?.username || 'Player'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Admin Notes */}
            <Textarea
              label="Admin Notes (optional)"
              placeholder="Add notes explaining your decision..."
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
            />

            {/* Error */}
            {actionError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {actionError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => { setResolveModal(null); setActionError(null); }}
              >
                Cancel
              </Button>
              <Button
                variant={resolution === 'resolved' ? 'primary' : 'danger'}
                onClick={() => resolveMut.mutate()}
                disabled={resolveMut.isPending || (resolution === 'resolved' && !selectedWinner)}
              >
                {resolveMut.isPending ? 'Saving…' : resolution === 'resolved' ? 'Confirm Resolution' : 'Dismiss Dispute'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
