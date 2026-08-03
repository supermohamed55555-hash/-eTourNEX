'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSponsors } from '@/lib/actions/sponsor-actions';
import type { Sponsor, SponsorTier } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Star, Globe, Zap, ArrowRight, Mail, ExternalLink, ShieldCheck,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const TIER_ORDER: SponsorTier[] = ['title', 'platinum', 'gold', 'silver', 'partner'];

const TIER_LABELS: Record<SponsorTier, string> = {
  title:    'TITLE PARTNERS',
  platinum: 'PLATINUM PARTNERS',
  gold:     'GOLD PARTNERS',
  silver:   'SILVER PARTNERS',
  partner:  'OFFICIAL PARTNERS',
};

const TIER_CARD_STYLES: Record<SponsorTier, string> = {
  title:    'border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-surface-2 to-amber-900/10 shadow-purple-glow-lg',
  platinum: 'border-slate-300/40 bg-gradient-to-br from-slate-400/20 via-surface-2 to-slate-800/10 shadow-purple-glow-sm',
  gold:     'border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-surface-2 to-yellow-900/10',
  silver:   'border-gray-400/25 bg-gradient-to-br from-gray-500/10 via-surface-2 to-gray-800/5',
  partner:  'border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-surface-2 to-purple-950/10',
};

const PERKS = [
  { icon: Globe,  title: 'Global Audience',     desc: 'Reach thousands of active competitive players across multiple esports titles.' },
  { icon: Star,   title: 'Brand Integration',   desc: 'Prime logo placement on tournament banners, bracket matches, and leaderboards.' },
  { icon: Zap,    title: 'Live Tournament Exposure', desc: 'Direct audience engagement during live tournament rounds and finals.' },
];

export default function SponsorsPage() {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors-public'],
    queryFn: () => fetchSponsors(),
  });

  const activeSponsors = sponsors.filter((s: Sponsor) => s.is_active);

  // Group by tier
  const groupedByTier = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = activeSponsors.filter((s: Sponsor) => s.tier === tier);
    return acc;
  }, {} as Record<SponsorTier, Sponsor[]>);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">

      {/* ── Hero ── */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Star className="w-3.5 h-3.5" />
          OFFICIAL PARTNERS
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white">
          Powering <span className="brand-text">Esports</span> Excellence
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
          Our partners make it possible to host world-class competitive events and provide platform rewards to players globally.
        </p>
      </div>

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="space-y-10">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-48 mx-auto" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-44 rounded-3xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Current Sponsors Grids by Tier ── */}
      {!isLoading && (
        <div className="space-y-14">
          {TIER_ORDER.map(tier => {
            const list = groupedByTier[tier];
            if (!list || list.length === 0) return null;

            return (
              <div key={tier} className="space-y-6">
                <div className="text-center">
                  <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                    {TIER_LABELS[tier]}
                  </span>
                </div>

                <div className={cn(
                  'grid gap-6',
                  tier === 'title' ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                )}>
                  {list.map((s: Sponsor) => (
                    <div
                      key={s.id}
                      className={cn(
                        'glass-card rounded-3xl p-8 border text-center flex flex-col items-center gap-4 card-hover relative overflow-hidden',
                        TIER_CARD_STYLES[s.tier]
                      )}
                    >
                      {/* Logo */}
                      <div className="w-24 h-24 rounded-2xl bg-surface-1 border border-white/10 p-3 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                        {/* eslint-disable-next-html-extension/no-img-element */}
                        <img
                          src={s.logo_url}
                          alt={s.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white">{s.name}</h3>
                        {s.description && (
                          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{s.description}</p>
                        )}
                      </div>

                      {s.website_url && (
                        <a
                          href={s.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 mt-auto"
                        >
                          Visit Partner <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {activeSponsors.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-gray-400">Sponsorship opportunities are currently open!</p>
            </div>
          )}
        </div>
      )}

      {/* ── Become a Sponsor CTA ── */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-primary-500/30 p-10 sm:p-16 text-center">
        <div className="absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Become a Platform Sponsor
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Partner with eTourNEX to connect your brand with an engaged competitive gaming audience. Our customizable packages feature title sponsorships, tournament bracket placement, and direct player engagement.
          </p>

          {/* Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
            {PERKS.map(p => (
              <div key={p.title} className="glass p-5 rounded-2xl border border-white/10 text-left space-y-2">
                <p.icon className="w-6 h-6 text-primary-400" />
                <h4 className="font-bold text-white text-sm">{p.title}</h4>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            size="xl"
            icon={<Mail className="w-4 h-4" />}
            iconRight={<ArrowRight className="w-4 h-4" />}
            onClick={() => setInquiryModalOpen(true)}
          >
            Request Sponsorship Info
          </Button>
        </div>
      </div>

      {/* ── Sponsorship Inquiry Modal ── */}
      {inquiryModalOpen && (
        <Modal
          title="Partner With eTourNEX"
          open={inquiryModalOpen}
          onClose={() => { setInquiryModalOpen(false); setSubmitted(false); }}
        >
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Inquiry Received!</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Thank you for your interest. Our partnerships team will get back to you shortly.
              </p>
              <Button
                variant="ghost"
                onClick={() => { setInquiryModalOpen(false); setSubmitted(false); }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <p className="text-xs text-gray-400">
                Fill out the form below and our team will get back to you with custom sponsorship packages.
              </p>

              <Input
                label="Company / Brand Name"
                placeholder="e.g. Acme Gaming"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />

              <Input
                label="Business Email"
                type="email"
                placeholder="partnerships@company.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <Textarea
                label="Tell us about your brand goals"
                placeholder="Which tournaments or tier levels are you interested in?"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="ghost" type="button" onClick={() => setInquiryModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Send Inquiry
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

    </div>
  );
}
