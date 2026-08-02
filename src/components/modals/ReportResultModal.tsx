'use client';

import React, { useState, useRef } from 'react';
import { Match, Profile } from '@/lib/types/database';
import { uploadMatchProof } from '@/lib/actions/storage-actions';
import { X, Upload, AlertCircle, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface ReportResultModalProps {
  match: Match;
  currentUser: Profile;
  onClose: () => void;
  onSubmit: (scoreA: number, scoreB: number, screenshotUrl: string) => Promise<unknown>;
}

export function ReportResultModal({
  match,
  currentUser,
  onClose,
  onSubmit
}: ReportResultModalProps) {
  const [scoreA, setScoreA] = useState<number>(match.score_a || 0);
  const [scoreB, setScoreB] = useState<number>(match.score_b || 0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(match.proof_screenshot_url || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setError(null);
    setProofFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proofFile && !match.proof_screenshot_url) {
      setError('Proof screenshot is MANDATORY! Upload an end-game screenshot to submit your result.');
      return;
    }

    if (scoreA < 0 || scoreB < 0) {
      setError('Scores cannot be negative.');
      return;
    }

    if (scoreA === scoreB) {
      setError('Single elimination matches must have a decisive winner (no draws).');
      return;
    }

    try {
      setLoading(true);

      let screenshotUrl = match.proof_screenshot_url || '';

      // Upload file if a new one was selected
      if (proofFile) {
        setUploadProgress('Uploading proof screenshot...');
        const formData = new FormData();
        formData.append('file', proofFile);
        screenshotUrl = await uploadMatchProof(formData);
      }

      setUploadProgress('Submitting result...');
      await onSubmit(scoreA, scoreB, screenshotUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report match result.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const playerA = match.player_a?.profile;
  const playerB = match.player_b?.profile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-white/10 shadow-glass relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-secondary-500 flex items-center justify-center text-white">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Report Match Result</h3>
            <p className="text-xs text-gray-400 font-mono">Match #{match.id.slice(-6)} • {match.round_name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Score Inputs */}
          <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            {/* Player A Score */}
            <div className="flex flex-col items-center text-center">
              <img
                src={playerA?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${playerA?.username || 'a'}`}
                alt={playerA?.username}
                className="w-10 h-10 rounded-full border border-white/10 mb-2"
              />
              <span className="text-xs font-bold text-white truncate max-w-full">
                {playerA?.display_name || playerA?.username || 'Player A'}
              </span>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="mt-2 w-20 text-center font-mono font-bold text-2xl py-2 bg-gaming-dark rounded-xl border border-primary-500/50 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Player B Score */}
            <div className="flex flex-col items-center text-center">
              <img
                src={playerB?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${playerB?.username || 'b'}`}
                alt={playerB?.username}
                className="w-10 h-10 rounded-full border border-white/10 mb-2"
              />
              <span className="text-xs font-bold text-white truncate max-w-full">
                {playerB?.display_name || playerB?.username || 'Player B'}
              </span>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="mt-2 w-20 text-center font-mono font-bold text-2xl py-2 bg-gaming-dark rounded-xl border border-primary-500/50 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-accent-neon" />
              Proof Screenshot <span className="text-red-400">* Mandatory</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {proofPreview ? (
              <div className="relative group">
                <img
                  src={proofPreview}
                  alt="Proof preview"
                  className="w-full h-40 object-cover rounded-xl border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-accent-neon text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  {proofFile ? proofFile.name : 'Previous proof'}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-primary-500/50 bg-white/5 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-500" />
                <span className="text-xs text-gray-400">
                  Click to upload screenshot (JPEG, PNG, WebP • max 5MB)
                </span>
              </button>
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
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-neon text-white text-xs font-bold shadow-purple-glow hover:opacity-90 transition-all flex items-center gap-2"
            >
              {loading ? uploadProgress || 'Submitting...' : 'Submit Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
