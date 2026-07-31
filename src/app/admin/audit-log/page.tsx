'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Clock, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

async function fetchAuditLogs() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  // Fetch usernames separately since audit_logs references auth.users, not profiles
  const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(log => ({
    ...log,
    user: profileMap.get(log.user_id) || null,
  }));
}

const actionColors: Record<string, string> = {
  create_tournament: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  update_tournament: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  generate_bracket: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  confirm_match: 'text-accent-neon bg-accent-neon/10 border-accent-neon/20',
  reject_match: 'text-red-400 bg-red-500/10 border-red-500/20',
  dispute_match: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  promote_user: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  demote_user: 'text-gray-400 bg-white/5 border-white/10',
  force_verify_user: 'text-secondary-400 bg-secondary-500/10 border-secondary-500/20',
  suspend_user: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function AuditLogPage() {
  const { profile: currentUser } = useAuth();
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: fetchAuditLogs,
    enabled: currentUser?.role === 'admin',
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="text-center py-20 text-gray-400">Admin access required.</div>;
  }

  const filtered = logs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    (log.user as any)?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Audit Log</h1>
          <p className="text-xs text-gray-400">All administrative actions and system events</p>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by action, entity type, or admin..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
      />

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-sm">
          {(error as Error).message}. Make sure the audit_logs table exists (run 002_hardening.sql migration).
        </div>
      )}

      {/* Log Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton className="h-4 w-24" /></td>
                  <td><Skeleton className="h-4 w-20" /></td>
                  <td><Skeleton className="h-4 w-28" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                  <td><Skeleton className="h-4 w-40" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                  {search ? 'No matching audit log entries.' : 'No audit log entries yet.'}
                </td>
              </tr>
            ) : (
              filtered.map(log => {
                const user = log.user as any;
                const colorClass = actionColors[log.action] || 'text-gray-400 bg-white/5 border-white/10';
                const details = log.details as Record<string, any>;

                return (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-400 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="text-sm font-bold text-white">
                      {user?.username || 'System'}
                    </td>
                    <td>
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full border ${colorClass}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">
                      <span className="font-mono">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-gray-600 ml-1">#{log.entity_id.slice(-6)}</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500 max-w-xs truncate">
                      {details && Object.keys(details).length > 0
                        ? Object.entries(details)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(', ')
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
