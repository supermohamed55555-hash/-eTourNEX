'use client';

import React, { useState } from 'react';
import { Match, Profile } from '@/lib/types/database';
import { X, ShieldCheck, AlertCircle, Image as ImageIcon, CheckCircle2, Trophy } from 'lucide-react';

interface ConfirmResultModalProps {
  match: Match;
  adminUser: Profile;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmResultModal({
  match,
  adminUser,
  onClose,
  onConfirm
}: ConfirmResultModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerA = match.player_a?.profile;
  const playerB = match.player_b?.profile;

  const scoreA = match.score_a || 0;
  const scoreB = match.score_b || 0;
  const winnerName = scoreA > scoreB ? (playerA?.display_name || playerA?.username) : (playerB?.display_name || playerB?.username);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm match result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-purple-500/30 shadow-purple-glow relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Admin Match Review</h3>
            <p className="text-xs text-purple-300 font-mono">Match #{match.id.slice(-6)} • {match.round_name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Score & Winner Overview */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="flex flex-col items-center">
                <img
                  src={playerA?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=a'}
                  alt={playerA?.username}
                  className="w-12 h-12 rounded-full border border-white/10 mb-1"
                />
                <span className="text-xs font-bold text-white">{playerA?.display_name || playerA?.username}</span>
                <span className="text-2xl font-extrabold font-mono text-accent-neon">{scoreA}</span>
              </div>

              <span className="text-gray-500 font-mono font-extrabold text-xl">VS</span>

              <div className="flex flex-col items-center">
                <img
                  src={playerB?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=b'}
                  alt={playerB?.username}
                  className="w-12 h-12 rounded-full border border-white/10 mb-1"
                />
                <span className="text-xs font-bold text-white">{playerB?.display_name || playerB?.username}</span>
                <span className="text-2xl font-extrabold font-mono text-accent-neon">{scoreB}</span>
              </div>
            </div>

            <div className="py-2 px-4 rounded-xl bg-accent-green/10 border border-accent-neon/30 inline-flex items-center gap-2 text-xs font-bold text-accent-neon">
              <Trophy className="w-4 h-4 text-accent-neon" />
              <span>Projected Winner: {winnerName}</span>
            </div>
          </div>

          {/* Screenshot Proof Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary-400" />
              Attached Proof Screenshot
            </h4>

            {match.proof_screenshot_url ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 group max-h-48">
                <img
                  src={match.proof_screenshot_url}
                  alt="Match Proof"
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <a
                  href={match.proof_screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                >
                  Click to open full resolution
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs">
                No screenshot url attached.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-accent-neon text-gaming-dark text-xs font-extrabold shadow-neon hover:bg-emerald-400 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Confirming...' : 'Approve & Advance Winner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
