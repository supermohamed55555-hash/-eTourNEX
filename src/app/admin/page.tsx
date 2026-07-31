'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfiles, fetchTournaments, fetchPendingReviews } from '@/lib/bracket/engine';
import { confirmMatch, rejectMatch } from '@/lib/actions/match-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton, StatSkeleton } from '@/components/ui/Skeleton';
import { Users, Trophy, Swords, ShieldCheck, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import Link from 'next/link';

const CHART_DATA = [
  { name: 'Mon', active: 120 }, { name: 'Tue', active: 210 }, { name: 'Wed', active: 180 },
  { name: 'Thu', active: 340 }, { name: 'Fri', active: 450 }, { name: 'Sat', active: 620 }, { name: 'Sun', active: 780 },
];

export default function AdminDashboardPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading: loadingP } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const { data: tournaments = [], isLoading: loadingT } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: pending = [], isLoading: loadingM } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: fetchPendingReviews,
  });

  const confirmMut = useMutation({
    mutationFn: (matchId: string) => confirmMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (matchId: string) => rejectMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    },
  });

  const isLoading = loadingP || loadingT || loadingM;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> ADMINISTRATION PORTAL
          </div>
          <h1 className="text-3xl font-black text-white">Platform <span className="brand-text">Overview</span></h1>
        </div>
        <Link href="/admin/tournaments">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Create Tournament</Button>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Users"          value={profiles.length}    icon={<Users    className="w-5 h-5 text-primary-400"   />} />
            <StatCard label="Active Tournaments"   value={tournaments.length} icon={<Trophy   className="w-5 h-5 text-amber-400"     />} />
            <StatCard label="Matches Played"       value={42}                 icon={<Swords   className="w-5 h-5 text-secondary-400" />} />
            <StatCard label="Awaiting Review"      value={pending.length}     icon={<ShieldCheck className="w-5 h-5 text-red-400"   />} positive={pending.length === 0} />
          </>
        )}
      </div>

      {/* Chart */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0 pb-4"><CardTitle>Weekly Active Competitors</CardTitle></CardHeader>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CHART_DATA}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#151522', borderColor: '#222236', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="active" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Lower Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Users Table */}
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Verified</th></tr>
              </thead>
              <tbody>
                {profiles.slice(0, 5).map(p => (
                  <tr key={p.id}>
                    <td className="font-bold text-white">{p.username}</td>
                    <td><Badge variant={p.role === 'admin' ? 'admin' : 'player'}>{p.role}</Badge></td>
                    <td>
                      {p.email_confirmed
                        ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Yes</span>
                        : <span className="text-[10px] font-bold text-gray-500">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Proof Queue */}
        <Card>
          <CardHeader><CardTitle>Match Proof Queue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loadingM ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-surface-2 border border-white/10">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))
            ) : pending.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No pending match proofs. ✅</p>
            ) : pending.map(m => (
              <div key={m.id} className="p-4 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">Match #{m.id.slice(-4)}</p>
                  <p className="text-xs text-gray-400">{m.round_name} — Score: {m.score_a ?? '?'} - {m.score_b ?? '?'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="neon"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => confirmMut.mutate(m.id)}
                    disabled={confirmMut.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() => rejectMut.mutate(m.id)}
                    disabled={rejectMut.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
