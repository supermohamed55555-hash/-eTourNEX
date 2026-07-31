'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Gamepad2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl">
              <span className="brand-text">eTour</span><span className="text-white">NEX</span>
            </span>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black text-white">Forgot Password</h1>
          <p className="text-gray-400 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-accent-neon/10 border border-accent-neon/30 text-accent-neon text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Password reset email sent! Check your inbox for the reset link.
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary-400 hover:text-primary-300 font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
                Sign In &rarr;
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
