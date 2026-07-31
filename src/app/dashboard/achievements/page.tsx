'use client';

import React from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { Award, Trophy, Star, Flame, Shield, Swords, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACHIEVEMENTS = [
  { id: 1, icon: Trophy, title: 'First Blood',     desc: 'Win your very first tournament match.',    unlocked: true,  color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  { id: 2, icon: Flame,  title: 'On Fire',          desc: 'Win 3 matches in a row without a loss.',   unlocked: true,  color: 'text-red-400',     bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  { id: 3, icon: Star,   title: 'Star Player',      desc: 'Reach a win rate of 70% or higher.',       unlocked: false, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
  { id: 4, icon: Shield, title: 'Ironclad',         desc: 'Complete a tournament without a single loss.', unlocked: false, color: 'text-secondary-400', bg: 'bg-secondary-500/10', border: 'border-secondary-500/20' },
  { id: 5, icon: Swords, title: 'Tournament Veteran', desc: 'Participate in 10 or more tournaments.',  unlocked: false, color: 'text-accent-neon', bg: 'bg-accent-neon/10', border: 'border-accent-neon/20' },
  { id: 6, icon: Award,  title: 'Grand Champion',   desc: 'Win a tournament from start to finish.',   unlocked: false, color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
];

export default function AchievementsPage() {
  const unlocked = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <DashboardSidebar />
      <main className="flex-1 space-y-8">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-white">My <span className="brand-text">Achievements</span></h1>
          <div className="text-right">
            <p className="text-2xl font-black text-white font-mono">{unlocked}/{ACHIEVEMENTS.length}</p>
            <p className="text-xs text-gray-400">Unlocked</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar h-2">
          <div className="progress-fill" style={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%` }} />
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACHIEVEMENTS.map(a => (
            <div
              key={a.id}
              className={cn(
                'glass-card rounded-2xl p-6 border flex flex-col gap-4 transition-all duration-200',
                a.unlocked
                  ? `${a.border} card-hover`
                  : 'border-white/08 opacity-60 grayscale'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn('p-4 rounded-2xl', a.bg, 'border', a.border, 'relative')}>
                  <a.icon className={cn('w-7 h-7', a.unlocked ? a.color : 'text-gray-600')} />
                  {!a.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                      <Lock className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className={cn('font-bold', a.unlocked ? 'text-white' : 'text-gray-500')}>{a.title}</h3>
                  {a.unlocked && (
                    <span className="text-[10px] font-bold text-accent-neon uppercase tracking-widest">UNLOCKED</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
