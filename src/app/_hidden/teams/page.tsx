'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Swords, Users, Trophy, Globe, Plus } from 'lucide-react';

const MOCK_TEAMS = [
  { id: 1, name: 'Phantom Elite',      tag: 'PHE', members: 5, wins: 12, country: 'EG', game: 'eFootball 2025',  color: 'from-primary-600/30 to-primary-900/10' },
  { id: 2, name: 'Cyber Wolves',       tag: 'CWF', members: 5, wins: 9,  country: 'SA', game: 'eFootball 2025',  color: 'from-secondary-600/30 to-secondary-900/10' },
  { id: 3, name: 'Desert Storm',       tag: 'DST', members: 4, wins: 7,  country: 'AE', game: 'eFootball 2025',  color: 'from-amber-600/20 to-amber-900/5' },
  { id: 4, name: 'Night Raiders',      tag: 'NRT', members: 5, wins: 11, country: 'MA', game: 'eFootball 2025',  color: 'from-red-600/20 to-red-900/5' },
  { id: 5, name: 'Legion Alpha',       tag: 'LGA', members: 5, wins: 6,  country: 'TN', game: 'eFootball 2025',  color: 'from-accent-neon/10 to-emerald-900/5' },
  { id: 6, name: 'Apex Predators',    tag: 'APX', members: 5, wins: 15, country: 'EG', game: 'eFootball 2025',  color: 'from-purple-600/20 to-purple-900/5' },
];

const FLAG_URL = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export default function TeamsPage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">

      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 sm:p-12 border border-white/10">
        <div className="absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">
              <Swords className="w-3.5 h-3.5" />
              CLAN REGISTRY
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white">
              Esports <span className="brand-text">Teams</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Registered competitive squads ready to battle in team tournaments. Build your clan and dominate.
            </p>
          </div>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Create Team</Button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Teams Registered', value: MOCK_TEAMS.length, icon: Swords },
          { label: 'Active Players', value: MOCK_TEAMS.reduce((a, t) => a + t.members, 0), icon: Users },
          { label: 'Countries Represented', value: new Set(MOCK_TEAMS.map(t => t.country)).size, icon: Globe },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/10">
              <s.icon className="w-5 h-5 text-primary-400" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-black text-white font-mono">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_TEAMS.map((team, i) => (
          <div key={team.id} className={`glass-card rounded-3xl overflow-hidden border border-white/10 card-hover flex flex-col`}>
            
            {/* Card Banner */}
            <div className={`h-28 bg-gradient-to-br ${team.color} flex items-center justify-center relative`}>
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-black text-white">{team.tag}</span>
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <img src={FLAG_URL(team.country)} alt={team.country} className="h-5 rounded-sm opacity-80" />
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div>
                <h3 className="font-black text-white text-lg">{team.name}</h3>
                <p className="text-xs text-gray-400">{team.game}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                <div className="text-center">
                  <p className="text-lg font-black text-white">{team.members}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-emerald-400">{team.wins}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-amber-400">#{i + 1}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Rank</p>
                </div>
              </div>

              <Button variant="ghost" className="w-full mt-auto">View Team</Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
