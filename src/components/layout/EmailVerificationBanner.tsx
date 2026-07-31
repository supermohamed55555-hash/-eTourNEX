'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { createClient } from '@/lib/supabase/client';

export function EmailVerificationBanner() {
  const { user, profile, loading } = useAuth();
  const [resent, setResent] = useState(false);

  // Don't show banner while loading, if not logged in, or if already verified
  if (loading || !user || !profile || profile.email_confirmed) {
    return null;
  }

  const handleResend = async () => {
    if (!user?.email) return;

    try {
      const supabase = createClient();
      await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-900/90 via-yellow-900/90 to-amber-900/90 border-b border-amber-500/30 px-4 py-3 text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="font-bold text-white">Email Verification Required: </span>
            <span className="text-amber-200">
              You must verify your email address before you can join any tournament.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResend}
            disabled={resent}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-gaming-dark font-bold text-xs rounded-full transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resent ? 'animate-spin' : ''}`} />
            {resent ? 'Email Sent!' : 'Resend Verification Email'}
          </button>
          <Link
            href="/verify-email"
            className="text-xs text-amber-300 hover:text-white font-semibold underline underline-offset-2"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
