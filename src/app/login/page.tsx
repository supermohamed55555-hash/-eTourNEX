'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { lookupEmailByUsername } from '@/lib/actions/auth-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Gamepad2, LogIn, Mail, AlertCircle, Zap, Shield, Trophy } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      let email = identifier.trim();

      // If identifier doesn't contain @, treat as username and look up email
      if (!email.includes('@')) {
        const result = await lookupEmailByUsername(email);
        if (result.error || !result.email) {
          setError(result.error || 'Username not found.');
          setLoading(false);
          return;
        }
        email = result.email;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Invalid credentials. Please check your email/username and password.'
          : authError.message
        );
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">

      {/* Left: Visual Panel (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-gradient-to-br from-primary-900/80 via-surface-2 to-background border-r border-white/08">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary-600/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary-600/20 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl">
            <span className="brand-text">eTour</span><span className="text-white">NEX</span>
          </span>
        </div>

        {/* Center quote */}
        <div className="relative z-10 space-y-8">
          <blockquote className="text-3xl font-black text-white leading-tight">
            &ldquo;Every champion was once a <span className="brand-text">competitor</span> who refused to give up.&rdquo;
          </blockquote>

          {/* Features checklist */}
          <div className="space-y-4">
            {[
              { icon: Trophy, text: 'Compete in live tournaments' },
              { icon: Shield, text: 'Verified match results & fair play' },
              { icon: Zap,    text: 'Instant brackets, real-time leaderboards' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-gray-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-gray-600">&copy; 2026 eTourNEX — All Rights Reserved</p>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">

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

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">Welcome Back</h1>
            <p className="text-gray-400 text-sm">Sign in to your competitor account to continue.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email or Username"
              type="text"
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full"
            >
              {loading ? 'Signing In…' : 'Sign In to Arena'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            New to eTourNEX?{' '}
            <Link href="/register" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
              Create Account &rarr;
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
