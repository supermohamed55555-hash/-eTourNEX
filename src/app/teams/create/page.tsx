'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { createTeam } from '@/lib/actions/team-actions';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Shield, ArrowLeft, Globe, Users, Info } from 'lucide-react';
import Link from 'next/link';

const COUNTRIES = [
  'Egypt', 'Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Jordan', 'Lebanon',
  'Morocco', 'Algeria', 'Tunisia', 'Iraq', 'Bahrain', 'Oman', 'Yemen',
  'United States', 'United Kingdom', 'Germany', 'France', 'Spain',
  'Turkey', 'Brazil', 'South Korea', 'Japan', 'China', 'Other',
];

export default function CreateTeamPage() {
  const { profile: user } = useAuth();
  const router = useRouter();

  const [name, setName]               = useState('');
  const [tag, setTag]                 = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry]         = useState('');
  const [logoUrl, setLogoUrl]         = useState('');
  const [bannerUrl, setBannerUrl]     = useState('');
  const [isRecruiting, setIsRecruiting] = useState(true);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Please log in to create a team.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const team = await createTeam({
        name,
        tag: tag || undefined,
        description: description || undefined,
        country: country || undefined,
        logo_url: logoUrl || undefined,
        banner_url: bannerUrl || undefined,
        is_recruiting: isRecruiting,
      });
      router.push(`/teams/${team.slug}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const slugPreview = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'your-team-name';

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-primary-500/20 border border-primary-500/30">
            <Shield className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Create a Team</h1>
            <p className="text-gray-400 text-sm">Build your esports squad</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Basic Information</h2>

            <Input
              label="Team Name *"
              placeholder="e.g. NeXus Esports"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={60}
            />

            {name && (
              <p className="text-xs text-gray-500 -mt-2">
                URL: <span className="text-primary-400 font-mono">etournex.gg/teams/{slugPreview}</span>
              </p>
            )}

            <Input
              label="Team Tag (2–5 chars)"
              placeholder="e.g. NXS"
              value={tag}
              onChange={e => setTag(e.target.value.toUpperCase())}
              maxLength={5}
              hint="Short tag shown next to player names"
            />

            <Textarea
              label="Description"
              placeholder="Tell players about your team, your goals, and what you're looking for..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input w-full"
              >
                <option value="">Select country...</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c} className="bg-surface-2">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Media */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Media</h2>

            <Input
              label="Logo URL"
              placeholder="https://..."
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              hint="Direct link to your team logo (recommended: square, 256×256px)"
            />

            {logoUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-14 h-14 rounded-xl object-cover border border-white/10"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-xs text-gray-500">Logo preview</p>
              </div>
            )}

            <Input
              label="Banner URL"
              placeholder="https://..."
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
              hint="Banner image shown at the top of your team profile (recommended: 1200×300px)"
            />
          </div>

          {/* Settings */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Settings</h2>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRecruiting}
                  onChange={e => setIsRecruiting(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${isRecruiting ? 'bg-accent-neon' : 'bg-surface-3'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecruiting ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                  Open to Recruitment
                </p>
                <p className="text-xs text-gray-500">Allow players to send join requests</p>
              </div>
            </label>
          </div>

          {/* Info box */}
          <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>You will automatically become the captain of this team. You can invite players, manage members, and participate in tournaments together.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/teams')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!name.trim()}
              className="flex-1"
              icon={<Shield className="w-4 h-4" />}
            >
              Create Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
