'use client';

import React from 'react';
import { Match, TournamentParticipant, Profile } from '@/lib/types/database';
import { PlayerBadges } from '@/components/gaming/PlayerBadges';
import { Trophy, CheckCircle2, Clock, Upload, Shield, Image as ImageIcon } from 'lucide-react';

interface BracketProps {
  matches: Match[];
  participants: TournamentParticipant[];
  currentUser?: Profile | null;
  onReportMatch?: (match: Match) => void;
  onConfirmMatch?: (match: Match) => void;
}

export function SingleEliminationBracket({
  matches,
  participants,
  currentUser,
  onReportMatch,
  onConfirmMatch
}: BracketProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl border border-white/5">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Bracket Not Generated Yet</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          The tournament bracket will be created once registration closes and the tournament director initiates the draw.
        </p>
      </div>
    );
  }

  // Group matches by round_order
  const roundOrders = Array.from(new Set(matches.map(m => m.round_order))).sort((a, b) => a - b);

  const getRoundTitle = (roundOrder: number) => {
    const roundMatches = matches.filter(m => m.round_order === roundOrder);
    return roundMatches[0]?.round_name || `Round ${roundOrder}`;
  };

  return (
    <div className="w-full overflow-x-auto pb-6 scrollbar-thin">
      <div className="flex gap-8 min-w-[800px] p-4 items-stretch justify-center">
        {roundOrders.map((roundOrder) => {
          const roundMatches = matches
            .filter(m => m.round_order === roundOrder)
            .sort((a, b) => a.id.localeCompare(b.id));

          return (
            <div key={roundOrder} className="flex-1 flex flex-col justify-around min-w-[260px] gap-6">
              {/* Round Header */}
              <div className="glass-panel py-2 px-4 rounded-xl text-center border border-primary-500/30 bg-primary-950/20 mb-2">
                <span className="text-xs font-extrabold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-neon">
                  {getRoundTitle(roundOrder)}
                </span>
                <span className="text-[10px] text-gray-400 block font-mono">
                  {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                </span>
              </div>

              {/* Round Matches List */}
              <div className="flex flex-col justify-around flex-1 gap-8">
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    currentUser={currentUser}
                    onReportMatch={onReportMatch}
                    onConfirmMatch={onConfirmMatch}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  currentUser,
  onReportMatch,
  onConfirmMatch
}: {
  match: Match;
  currentUser?: Profile | null;
  onReportMatch?: (match: Match) => void;
  onConfirmMatch?: (match: Match) => void;
}) {
  const isPlayerA = Boolean(currentUser && match.player_a?.profile?.id === currentUser.id);
  const isPlayerB = Boolean(currentUser && match.player_b?.profile?.id === currentUser.id);
  const isParticipantInMatch = isPlayerA || isPlayerB;
  const isAdmin = currentUser?.role === 'admin';

  const isConfirmed = match.status === 'confirmed';
  const isPending = match.status === 'pending_review';
  const isWinnerA = Boolean(match.winner_id && match.winner_id === match.player_a_id);
  const isWinnerB = Boolean(match.winner_id && match.winner_id === match.player_b_id);

  return (
    <div
      className={`glass-panel rounded-2xl p-3 border transition-all duration-300 relative ${
        isPending
          ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10 bg-yellow-950/10'
          : isConfirmed
          ? 'border-accent-neon/30 shadow-lg shadow-accent-neon/5'
          : 'border-white/10 hover:border-primary-500/40'
      }`}
    >
      {/* Match Header Badge */}
      <div className="flex items-center justify-between text-[11px] mb-2 pb-1.5 border-b border-white/5">
        <span className="text-gray-400 font-mono">#{match.id.slice(-6)}</span>
        <span
          className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] ${
            isConfirmed
              ? 'bg-accent-green/20 text-accent-neon border border-accent-neon/30'
              : isPending
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-white/5 text-gray-400'
          }`}
        >
          {isConfirmed ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Confirmed
            </>
          ) : isPending ? (
            <>
              <Clock className="w-3 h-3 animate-spin text-yellow-400" /> Pending Review
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Scheduled
            </>
          )}
        </span>
      </div>

      {/* Player A Slot */}
      <PlayerSlot
        participant={match.player_a}
        score={match.score_a}
        isWinner={isWinnerA}
        isCurrent={isPlayerA}
      />

      <div className="my-1 border-t border-white/5" />

      {/* Player B Slot */}
      <PlayerSlot
        participant={match.player_b}
        score={match.score_b}
        isWinner={isWinnerB}
        isCurrent={isPlayerB}
      />

      {/* Screenshot Proof Indicator */}
      {match.proof_screenshot_url && (
        <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between bg-white/5 px-2 py-1 rounded-lg">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-primary-400" /> Proof Attached
          </span>
          <a
            href={match.proof_screenshot_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:underline"
          >
            View
          </a>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex gap-2">
        {/* Report Result Action for Participants */}
        {isParticipantInMatch && match.status === 'scheduled' && onReportMatch && (
          <button
            onClick={() => onReportMatch(match)}
            className="w-full py-1.5 px-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:opacity-90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-purple-glow transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Report Score
          </button>
        )}

        {/* Confirm Result Action for Admin */}
        {isAdmin && isPending && onConfirmMatch && (
          <button
            onClick={() => onConfirmMatch(match)}
            className="w-full py-1.5 px-3 bg-accent-neon hover:bg-emerald-400 text-gaming-dark font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-neon transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            Review & Confirm
          </button>
        )}
      </div>
    </div>
  );
}

function PlayerSlot({
  participant,
  score,
  isWinner,
  isCurrent
}: {
  participant?: TournamentParticipant | null;
  score?: number | null;
  isWinner?: boolean | null;
  isCurrent?: boolean | null;
}) {
  if (!participant || !participant.profile) {
    return (
      <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-gray-500 text-xs">
        <span className="italic">TBD (Winner advances)</span>
        <span className="font-mono text-gray-600">-</span>
      </div>
    );
  }

  const { profile, seed } = participant;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
        isWinner
          ? 'bg-gradient-to-r from-accent-green/20 to-transparent border border-accent-neon/40 text-white font-bold'
          : participant.eliminated
          ? 'opacity-50 text-gray-400'
          : 'bg-white/5 text-gray-200'
      } ${isCurrent ? 'ring-1 ring-primary-500' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Seed Number */}
        <span className="text-[10px] font-mono text-gray-400 bg-gaming-dark/60 px-1.5 py-0.5 rounded border border-white/10">
          #{seed || 1}
        </span>

        {/* Player Avatar */}
        <img
          src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
          alt={profile.username}
          className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
        />

        {/* Display Name */}
        <span className="text-xs font-semibold truncate max-w-[90px]">
          {profile.display_name || profile.username}
        </span>

        <PlayerBadges
          emailConfirmed={profile.email_confirmed}
          role={profile.role}
          size="sm"
        />
      </div>

      {/* Score */}
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
          isWinner
            ? 'bg-accent-neon text-gaming-dark'
            : score !== null && score !== undefined
            ? 'bg-white/10 text-white'
            : 'text-gray-500'
        }`}
      >
        {score !== null && score !== undefined ? score : '-'}
      </div>
    </div>
  );
}
