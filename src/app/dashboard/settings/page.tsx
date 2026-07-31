'use client';

import React, { useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/lib/auth/useAuth';
import { updateProfile } from '@/lib/actions/profile-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { profile: user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [country, setCountry] = useState(user?.country || '');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        display_name: displayName,
        country,
        bio,
      });
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-6">
        <h1 className="text-3xl font-black text-white">Profile <span className="brand-text">Settings</span></h1>

        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
            message.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/30 text-accent-neon' : 'bg-red-950/50 border-red-500/30 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
          <h2 className="text-lg font-bold text-white">Account Details</h2>

          <Input
            label="Username"
            defaultValue={user?.username || ''}
            icon={<User className="w-4 h-4" />}
            disabled
          />
          <Input
            label="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <Input
            label="Country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Your country"
          />
          <Input
            label="Bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell the community about yourself..."
          />

          <div className="pt-2">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs mb-4">
              Email address is managed through your Supabase account and cannot be changed here.
            </div>
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
