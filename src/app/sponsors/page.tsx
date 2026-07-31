'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Star, Globe, Zap, ArrowRight, Mail } from 'lucide-react';

const SPONSORS = [
  { name: 'NexGen Systems',    tier: 'PLATINUM', color: 'from-slate-300/30 to-slate-500/10', border: 'border-slate-400/30', logo: '⚡' },
  { name: 'Cyber Arena',       tier: 'PLATINUM', color: 'from-slate-300/30 to-slate-500/10', border: 'border-slate-400/30', logo: '🎮' },
  { name: 'GIGA Peripherals',  tier: 'GOLD',     color: 'from-amber-400/20 to-amber-700/10', border: 'border-amber-500/30', logo: '🖥️' },
  { name: 'StormGear',         tier: 'GOLD',     color: 'from-amber-400/20 to-amber-700/10', border: 'border-amber-500/30', logo: '🎧' },
  { name: 'ArcNet ISP',        tier: 'SILVER',   color: 'from-gray-400/15 to-gray-700/5',    border: 'border-gray-500/20',  logo: '🌐' },
  { name: 'ProPlay Academy',   tier: 'SILVER',   color: 'from-gray-400/15 to-gray-700/5',    border: 'border-gray-500/20',  logo: '📚' },
];

const PERKS = [
  { icon: Globe,  title: 'Global Audience',     desc: 'Reach 48,000+ active competitive gamers across 82 countries.' },
  { icon: Star,   title: 'Brand Integration',   desc: 'Logo placement on tournament banners, brackets, and player dashboards.' },
  { icon: Zap,    title: 'Live Match Exposure',  desc: 'Featured placement during bracket matches and prize ceremonies.' },
];

export default function SponsorsPage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">

      {/* Hero */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Star className="w-3.5 h-3.5" />
          OFFICIAL PARTNERS
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white">
          Powering <span className="brand-text">Esports</span> Excellence
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
          Our sponsors make it possible to host world-class competitive events and award life-changing prize pools to players globally.
        </p>
      </div>

      {/* Current Sponsors Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 text-center">Current Partners</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SPONSORS.map(s => (
            <div key={s.name} className={`glass-card rounded-3xl p-8 border ${s.border} text-center flex flex-col items-center gap-4 card-hover bg-gradient-to-br ${s.color}`}>
              <div className="text-5xl">{s.logo}</div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.tier} PARTNER</span>
                <h3 className="text-xl font-black text-white mt-1">{s.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Become a Sponsor CTA */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-primary-500/30 p-10 sm:p-16 text-center">
        <div className="absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Become a Platform Sponsor</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Partner with eTourNEX to connect your brand with the most passionate and engaged gaming community in the region. Our sponsorship packages include logo placement, social promotion, and prize pool co-branding.
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

          <Button variant="primary" size="xl" icon={<Mail className="w-4 h-4" />} iconRight={<ArrowRight className="w-4 h-4" />}>
            Request Sponsorship Info
          </Button>
        </div>
      </div>

    </div>
  );
}
