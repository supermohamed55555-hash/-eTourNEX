'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { createClient } from '@/lib/supabase/client';

function VerifyEmailContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const verifiedParam = searchParams.get('verified') === 'true';
  const errorParam = searchParams.get('error') === 'true';

  const verified = profile?.email_confirmed || verifiedParam;
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!user?.email) return;
    setResendError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setResendError(error.message);
        return;
      }

      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      setResendError('Failed to resend verification email.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600/20 to-amber-500/30 border border-amber-500/40 flex items-center justify-center">
          {verified ? (
            <CheckCircle2 className="w-10 h-10 text-accent-neon" />
          ) : (
            <Mail className="w-10 h-10 text-amber-400" />
          )}
        </div>

        {errorParam && !verified && (
          <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-sm">
            Email verification failed. The link may have expired. Please request a new one below.
          </div>
        )}

        {verified ? (
          <>
            <h1 className="text-3xl font-extrabold text-white">Email Verified!</h1>
            <p className="text-gray-400 text-sm">Your email has been verified. You can now join tournaments and compete.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/tournaments" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold text-sm shadow-purple-glow hover:opacity-90 flex items-center gap-2">
                Browse Tournaments <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-white">Check Your Email</h1>
            <p className="text-gray-400 text-sm">
              We sent a confirmation email{user?.email ? ` to ${user.email}` : ''}. Click the link in your email inbox to verify your account and unlock tournament registration.
            </p>

            <div className="glass-card rounded-3xl p-6 border border-amber-500/30 bg-amber-950/10 text-left space-y-3">
              <div className="flex items-start gap-3 text-sm text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Mandatory Registration Requirement</p>
                  <p className="text-xs mt-1">
                    Unverified accounts cannot register for any tournament. Server-side policies will reject joining attempts until your email is confirmed.
                  </p>
                </div>
              </div>
            </div>

            {resendError && (
              <p className="text-xs text-red-400">{resendError}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resent}
                className="w-full py-3 rounded-xl glass-panel border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${resent ? 'animate-spin text-accent-neon' : ''}`} />
                {resent ? 'Verification Email Sent!' : 'Resend Verification Email'}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Need to switch accounts?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300">Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center py-8">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600/20 to-amber-500/30 border border-amber-500/40 flex items-center justify-center">
              <Mail className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">Check Your Email</h1>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
