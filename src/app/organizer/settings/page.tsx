'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  Trophy, Swords, BarChart3, Settings, ShieldCheck,
  Bell, Shield, ExternalLink, Info
} from 'lucide-react';

export default function OrganizerSettingsPage() {
  const { profile: user } = useAuth();

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> ORGANIZER CENTER
        </div>
        <h1 className="text-3xl font-black text-white">
          Organizer <span className="brand-text">Settings</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage your organizer profile and platform preferences.</p>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <Link href="/organizer">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Overview
          </span>
        </Link>
        <Link href="/organizer/tournaments">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <Swords className="w-4 h-4" /> My Tournaments
          </span>
        </Link>
        <Link href="/organizer/analytics">
          <span className="px-4 py-2 rounded-xl glass text-gray-400 hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </span>
        </Link>
        <Link href="/organizer/settings">
          <span className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-purple-glow-sm cursor-pointer inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </span>
        </Link>
      </div>

      {/* Profile Overview Card */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" /> Organizer Profile
        </h2>
        <div className="flex items-center gap-4">
          <Avatar
            src={user?.avatar_url}
            alt={user?.username}
            seed={user?.username}
            size="lg"
          />
          <div>
            <p className="text-lg font-black text-white">{user?.username || 'Organizer'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="admin">{user?.role || 'organizer'}</Badge>
              {user?.email_confirmed && <Badge variant="verified">Verified</Badge>}
            </div>
            <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
          </div>
          <div className="ml-auto">
            <Link href="/dashboard/settings">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:underline">
                Edit Profile <ExternalLink className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Organizer Capabilities */}
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-secondary-400" /> Organizer Capabilities
        </h2>
        <p className="text-xs text-gray-400">
          As an <span className="text-purple-300 font-bold">Organizer</span>, you have full access to the following platform features:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Create Tournaments', desc: 'Host unlimited public tournaments' },
            { label: 'Bracket Management', desc: 'Generate and manage match brackets' },
            { label: 'Participant Removal', desc: 'Remove players during registration phase' },
            { label: 'Match Reporting', desc: 'Update match results and scores' },
            { label: 'Analytics Access', desc: 'View full performance analytics' },
            { label: 'Community Discussions', desc: 'Manage tournament comment threads' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-accent-neon mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-300">Account Settings</p>
          <p className="text-xs text-blue-400/70 mt-0.5">
            For full profile editing, password changes, notification preferences, and account security options, visit the{' '}
            <Link href="/dashboard/settings" className="underline hover:text-blue-300">
              Player Dashboard Settings
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
