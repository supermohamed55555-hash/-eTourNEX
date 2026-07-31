'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkUsernameAvailable } from '@/lib/actions/auth-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Gamepad2, UserPlus, Mail, User, AlertCircle, CheckCircle2, Trophy, Shield, Zap } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [username, setUsername]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@'))       { setError('Please enter a valid email address.'); return; }
    if (username.length < 3)                  { setError('Username must be at least 3 characters.'); return; }
    if (!/^[a-z0-9_]+$/.test(username))      { setError('Username can only contain lowercase letters, numbers, and underscores.'); return; }
    if (password.length < 6)                  { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);

    try {
      // Check username availability
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError('Username already taken. Please choose another.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName || username,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/verify-email'), 1500);
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">

      {/* Left: Visual Panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden bg-gradient-to-br from-secondary-900/60 via-surface-2 to-background border-r border-white/08">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(37,99,235,1) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-secondary-600/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-56 h-56 rounded-full bg-primary-600/15 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl">
            <span className="brand-text">eTour</span><span className="text-white">NEX</span>
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white leading-tight">
              Your journey to <span className="brand-text">greatness</span> begins here.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Join competitive players and start climbing the rankings today.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Trophy, text: 'Access to open tournaments' },
              { icon: Shield, text: 'Secure, fair results verification' },
              { icon: Zap,    text: 'Real-time brackets & leaderboards' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary-500/20 border border-secondary-500/30 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-secondary-400" />
                </div>
                <span className="text-gray-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-gray-600">
          Your data is encrypted and never sold.
        </p>
      </div>

      {/* Right: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">
                <span className="brand-text">eTour</span><span className="text-white">NEX</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">Create Account</h1>
            <p className="text-gray-400 text-sm">Join eTourNEX and start competing today.</p>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-4 rounded-2xl bg-accent-neon/10 border border-accent-neon/30 text-accent-neon text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Account created! Check your email for a verification link.
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <Input
              label="Email Address *"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Username *"
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              placeholder="unique_username"
              icon={<User className="w-4 h-4" />}
              hint="Lowercase letters, numbers, underscores only. Min 3 characters."
            />
            <Input
              label="Display Name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your public gaming name"
            />
            <Input
              label="Password *"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              hint="Use a strong password to protect your account."
            />

            {/* Email verification notice */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-200 text-xs">
              <strong className="text-amber-300">Email verification required:</strong>{' '}
              After registering, you must verify your email address before you can join any tournaments.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || success}
              icon={<UserPlus className="w-4 h-4" />}
              className="w-full"
            >
              {loading ? 'Creating Account…' : 'Join the Arena'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
              Sign In &rarr;
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
