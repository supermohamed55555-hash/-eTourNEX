'use client';

import React from 'react';
import { Gamepad2, Target, Shield, Zap, Users, Globe, Trophy, Heart } from 'lucide-react';

const VALUES = [
  { icon: Shield,  title: 'Fair Competition',   desc: 'Our AI-verified screenshot system ensures every result is legitimate and cheat-free.' },
  { icon: Zap,     title: 'Instant Brackets',   desc: 'Brackets generate in milliseconds, handling any format from 8 to 512 players.' },
  { icon: Users,   title: 'Community First',    desc: 'Every feature is designed based on real feedback from our competitive player base.' },
  { icon: Globe,   title: 'Global Reach',       desc: 'Connecting players across 82+ countries with zero language or currency barriers.' },
];

const MILESTONES = [
  { year: '2023', event: 'eTourNEX founded by a group of competitive gamers and engineers.' },
  { year: '2024', event: 'Launched Season 1 with 500 registered players across 3 games.' },
  { year: '2025', event: 'Reached 48,000+ players, $250K+ in prizes distributed globally.' },
  { year: '2026', event: 'Season 4 launched with AI-powered anti-cheat and bracket automation.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">

      {/* Hero */}
      <div className="text-center space-y-6 max-w-3xl mx-auto py-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mx-auto shadow-purple-glow">
          <Gamepad2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-white">
          Built for <span className="brand-text">Champions</span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          eTourNEX is a professional esports ecosystem built by competitive players, for competitive players.
          We believe everyone deserves a fair, transparent, and electrifying tournament experience.
        </p>
      </div>

      {/* Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-bold">
            <Target className="w-3.5 h-3.5" /> OUR MISSION
          </div>
          <h2 className="text-3xl font-black text-white">Democratizing Esports Competition</h2>
          <p className="text-gray-400 text-sm leading-loose">
            The esports industry has always been dominated by those with connections or expensive platforms. 
            eTourNEX changes that — offering professional-grade tournament infrastructure to every player, 
            regardless of their background, country, or team size.
          </p>
          <p className="text-gray-400 text-sm leading-loose">
            From solo players to organized teams, from casual weekly cups to high-stakes championship brackets, 
            eTourNEX gives everyone an equal shot at glory.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { n: '48K+', l: 'Players' }, { n: '1,240+', l: 'Tournaments' },
            { n: '$250K+', l: 'Prizes Paid' }, { n: '82', l: 'Countries' },
          ].map(s => (
            <div key={s.l} className="glass-card rounded-2xl p-6 text-center border border-white/10 card-hover">
              <p className="text-3xl font-black text-white brand-text">{s.n}</p>
              <p className="text-xs text-gray-400 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="space-y-10">
        <h2 className="text-3xl font-black text-white text-center">What We Stand For</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(v => (
            <div key={v.title} className="glass-card rounded-2xl p-6 border border-white/10 card-hover flex flex-col gap-4">
              <div className="p-3 rounded-2xl bg-primary-500/10 w-fit">
                <v.icon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        <h2 className="text-3xl font-black text-white text-center">Our Journey</h2>
        <div className="relative space-y-6 pl-8 border-l-2 border-primary-500/30 ml-4">
          {MILESTONES.map((m, i) => (
            <div key={m.year} className="relative">
              <div className="absolute -left-[41px] w-6 h-6 rounded-full bg-primary-600 border-2 border-gaming-dark flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary-300" />
              </div>
              <div className="glass-card rounded-xl p-5 border border-white/10">
                <span className="text-xs font-black text-primary-400 uppercase tracking-widest">{m.year}</span>
                <p className="text-sm text-gray-300 mt-1 leading-relaxed">{m.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Love Note */}
      <div className="text-center glass-card rounded-3xl p-12 border border-white/10 max-w-2xl mx-auto space-y-4">
        <Heart className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-2xl font-black text-white">Made with love for gaming</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Every line of code in eTourNEX was written by people who understand competitive gaming from the inside. 
          We are players. We are builders. We are here to make esports better for everyone.
        </p>
      </div>

    </div>
  );
}
