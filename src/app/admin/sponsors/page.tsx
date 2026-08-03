'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { notFound } from 'next/navigation';
import { fetchSponsors, createSponsor, updateSponsor, deleteSponsor } from '@/lib/actions/sponsor-actions';
import type { Sponsor, SponsorTier } from '@/lib/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Star, Plus, Trash2, Edit2, Globe, Shield, ExternalLink,
  CheckCircle2, XCircle, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const TIER_COLORS: Record<SponsorTier, string> = {
  title:    'border-amber-400/40 text-amber-300 bg-amber-500/10',
  platinum: 'border-slate-300/40 text-slate-200 bg-slate-400/10',
  gold:     'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
  silver:   'border-gray-400/40 text-gray-300 bg-gray-500/10',
  partner:  'border-purple-500/40 text-purple-300 bg-purple-500/10',
};

export default function AdminSponsorsPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen]       = useState(false);
  const [editSponsor, setEditSponsor]   = useState<Sponsor | null>(null);

  // Form State
  const [name, setName]                 = useState('');
  const [tier, setTier]                 = useState<SponsorTier>('gold');
  const [logoUrl, setLogoUrl]           = useState('');
  const [websiteUrl, setWebsiteUrl]     = useState('');
  const [description, setDescription]   = useState('');
  const [sortOrder, setSortOrder]       = useState(0);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors-admin'],
    queryFn: () => fetchSponsors(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createSponsor({
        name,
        tier,
        logo_url: logoUrl,
        website_url: websiteUrl || null,
        description: description || null,
        sort_order: sortOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-admin'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors-public'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to create sponsor.'),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateSponsor(editSponsor!.id, {
        name,
        tier,
        logo_url: logoUrl,
        website_url: websiteUrl || null,
        description: description || null,
        sort_order: sortOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-admin'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors-public'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to update sponsor.'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (sponsor: Sponsor) =>
      updateSponsor(sponsor.id, { is_active: !sponsor.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-admin'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors-public'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSponsor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors-admin'] });
      queryClient.invalidateQueries({ queryKey: ['sponsors-public'] });
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  const openCreateModal = () => {
    setEditSponsor(null);
    setName('');
    setTier('gold');
    setLogoUrl('');
    setWebsiteUrl('');
    setDescription('');
    setSortOrder(sponsors.length + 1);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (sponsor: Sponsor) => {
    setEditSponsor(sponsor);
    setName(sponsor.name);
    setTier(sponsor.tier);
    setLogoUrl(sponsor.logo_url);
    setWebsiteUrl(sponsor.website_url || '');
    setDescription(sponsor.description || '');
    setSortOrder(sponsor.sort_order);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditSponsor(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
            <Star className="w-3.5 h-3.5" /> SPONSOR MANAGEMENT
          </div>
          <h1 className="text-3xl font-black text-white">
            Platform <span className="brand-text">Sponsors</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage platform partners, tier displays, and logos.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/sponsors" target="_blank">
            <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>
              View Live Page
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Add Sponsor
          </Button>
        </div>
      </div>

      {/* Sponsors Table / List */}
      <Card>
        <CardHeader>
          <CardTitle>All Sponsors ({sponsors.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : sponsors.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-gray-400 font-bold">No sponsors found.</p>
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                Add Your First Sponsor
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sponsors.map((s: Sponsor) => (
                <div
                  key={s.id}
                  className={cn(
                    'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/[0.02]',
                    !s.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Logo thumbnail */}
                    <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {/* eslint-disable-next-html-extension/no-img-element */}
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain rounded-xl" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-white text-base">{s.name}</h3>
                        <span className={cn(
                          'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border',
                          TIER_COLORS[s.tier]
                        )}>
                          {s.tier}
                        </span>
                        {!s.is_active && (
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20">
                            Inactive
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-gray-400 mt-1 max-w-md line-clamp-1">{s.description}</p>
                      )}
                      {s.website_url && (
                        <a
                          href={s.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Globe className="w-3 h-3" /> {s.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActiveMut.mutate(s)}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {s.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(s)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        if (confirm(`Delete sponsor "${s.name}"?`)) deleteMut.mutate(s.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          title={editSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
          open={modalOpen}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <Input
              label="Sponsor Name"
              placeholder="e.g. NexGen Systems"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Sponsorship Tier</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value as SponsorTier)}
                className="input w-full"
              >
                <option value="title">Title Partner</option>
                <option value="platinum">Platinum Partner</option>
                <option value="gold">Gold Partner</option>
                <option value="silver">Silver Partner</option>
                <option value="partner">Official Partner</option>
              </select>
            </div>

            <Input
              label="Logo Image URL"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
            />

            <Input
              label="Website URL (optional)"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Short bio or motto..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />

            <Input
              label="Sort Order"
              type="number"
              value={sortOrder.toString()}
              onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
            />

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => editSponsor ? updateMut.mutate() : createMut.mutate()}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {createMut.isPending || updateMut.isPending ? 'Saving…' : editSponsor ? 'Save Changes' : 'Create Sponsor'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
