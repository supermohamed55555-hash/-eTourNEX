'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Gamepad2, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Failed to reset password. Please try again.');
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
          <h1 className="text-3xl font-black text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm">Choose a new password for your account.</p>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-accent-neon/10 border border-accent-neon/30 text-accent-neon text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Password updated! Redirecting to sign in…
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
                label="New Password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                icon={<Lock className="w-4 h-4" />}
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                icon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
                &larr; Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
