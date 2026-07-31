'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfiles } from '@/lib/bracket/engine';
import { promoteUser, demoteUser, forceVerifyUser, suspendUser } from '@/lib/actions/admin-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldCheck, Search, UserCheck, Users, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Profile } from '@/lib/types/database';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const promoteMut = useMutation({
    mutationFn: (userId: string) => promoteUser(userId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'User promoted to admin.' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setModalOpen(false);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const demoteMut = useMutation({
    mutationFn: (userId: string) => demoteUser(userId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'User demoted to player.' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setModalOpen(false);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const verifyMut = useMutation({
    mutationFn: (userId: string) => forceVerifyUser(userId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'User email verified.' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setModalOpen(false);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const suspendMut = useMutation({
    mutationFn: (userId: string) => suspendUser(userId),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'User suspended.' });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setModalOpen(false);
    },
    onError: (err: any) => setMessage({ type: 'error', text: err.message }),
  });

  const filtered = profiles.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> USER MANAGEMENT
          </div>
          <h1 className="text-3xl font-black text-white">Registered <span className="brand-text">Users</span></h1>
        </div>
        <div className="glass-card rounded-xl p-3 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10">
            <Users className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <p className="text-lg font-black text-white">{profiles.length}</p>
            <p className="text-[10px] text-gray-400">Total Users</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/30 text-accent-neon' : 'bg-red-950/50 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search users by username..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
      />

      {/* Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/10">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Player</th><th>Role</th><th>Email Status</th><th>Country</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton className="h-4 w-6" /></td>
                  <td><Skeleton className="h-4 w-32" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                </tr>
              ))
            ) : (
              filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-gray-500 font-mono text-xs">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar src={p.avatar_url} alt={p.username} size="sm" seed={p.username} />
                      <div>
                        <p className="font-bold text-white text-sm">{p.username}</p>
                        {p.display_name && p.display_name !== p.username && (
                          <p className="text-xs text-gray-400">{p.display_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><Badge variant={p.role === 'admin' ? 'admin' : 'player'}>{p.role}</Badge></td>
                  <td>
                    {p.email_confirmed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <UserCheck className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Pending</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-400">{p.country ?? '—'}</td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(p); setModalOpen(true); }}>Manage</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Manage: ${selectedUser?.username}`} size="sm">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-white/10">
              <Avatar src={selectedUser.avatar_url} alt={selectedUser.username} size="lg" seed={selectedUser.username} />
              <div>
                <p className="font-bold text-white">{selectedUser.username}</p>
                <Badge variant={selectedUser.role === 'admin' ? 'admin' : 'player'} className="mt-1">{selectedUser.role}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              {selectedUser.role === 'admin' ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => demoteMut.mutate(selectedUser.id)}
                  disabled={demoteMut.isPending}
                >
                  {demoteMut.isPending ? 'Demoting...' : 'Demote to Player'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => promoteMut.mutate(selectedUser.id)}
                  disabled={promoteMut.isPending}
                >
                  {promoteMut.isPending ? 'Promoting...' : 'Promote to Admin'}
                </Button>
              )}
              {!selectedUser.email_confirmed && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => verifyMut.mutate(selectedUser.id)}
                  disabled={verifyMut.isPending}
                >
                  {verifyMut.isPending ? 'Verifying...' : 'Force Verify Email'}
                </Button>
              )}
              <Button
                variant="danger"
                className="w-full"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => suspendMut.mutate(selectedUser.id)}
                disabled={suspendMut.isPending}
              >
                {suspendMut.isPending ? 'Suspending...' : 'Suspend Account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
