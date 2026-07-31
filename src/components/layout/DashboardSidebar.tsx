'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Swords, Award, Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { profile: user } = useAuth();

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/tournaments', label: 'My Tournaments', icon: Trophy },
    { href: '/dashboard/matches', label: 'Match Center', icon: Swords },
    { href: '/dashboard/achievements', label: 'Achievements', icon: Award },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6">

        {/* User Card */}
        <div className="flex items-center gap-3 pb-6 border-b border-white/10">
          <Avatar src={user?.avatar_url} alt={user?.username || 'Player'} size="md" seed={user?.username} />
          <div className="overflow-hidden">
            <h3 className="font-bold text-white text-sm truncate">{user?.username || 'Player'}</h3>
            <Badge variant={user?.role === 'admin' ? 'admin' : 'player'}>{user?.role || 'Player'}</Badge>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
              >
                <l.icon className="w-4 h-4 shrink-0" />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {user?.role === 'admin' && (
          <div className="pt-4 border-t border-white/10">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all"
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Portal</span>
            </Link>
          </div>
        )}

      </div>
    </aside>
  );
}
