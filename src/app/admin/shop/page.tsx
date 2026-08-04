'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { fetchAllShopItemsAdmin, createShopItem, updateShopItem, deleteShopItem } from '@/lib/actions/shop-actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ShoppingBag, Plus, Trash2, Edit2, Shield, Sparkles, CheckCircle2,
  Crown, Palette, Image as ImageIcon, ToggleLeft, ToggleRight
} from 'lucide-react';
import { notFound } from 'next/navigation';
import type { ShopItem, ShopCategory } from '@/lib/types/database';

export default function AdminShopPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem]   = useState<ShopItem | null>(null);

  // Form states
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState<ShopCategory>('avatar_frame');
  const [price, setPrice]             = useState('300');
  const [cssValue, setCssValue]       = useState('ring-2 ring-accent-neon shadow-[0_0_15px_#00f0ff]');
  const [season, setSeason]           = useState('');
  const [formError, setFormError]     = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-shop-items'],
    queryFn: fetchAllShopItemsAdmin,
  });

  const createMut = useMutation({
    mutationFn: createShopItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-items'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopItem> }) => updateShopItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-items'] });
      setEditingItem(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteShopItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-shop-items'] }),
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('avatar_frame');
    setPrice('300');
    setCssValue('');
    setSeason('');
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMut.mutate({
      name,
      description,
      category,
      price: Number(price),
      css_value: cssValue,
      season: season || undefined,
    });
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5" /> ADMIN SHOP CMS
          </div>
          <h1 className="text-3xl font-black text-white">
            Manage <span className="brand-text">Points Shop Items</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Add, update prices, toggle availability, or delete cosmetic rewards.</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add Shop Item
        </Button>
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5">Item</th>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-left px-5 py-3.5">Price</th>
                  <th className="text-left px-5 py-3.5">CSS Style</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item: ShopItem) => (
                  <tr key={item.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 font-bold text-white">
                      <div>{item.name}</div>
                      {item.season && <div className="text-[10px] text-purple-400 font-extrabold">{item.season}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="admin">{item.category.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-amber-400">
                      {item.price} pts
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-400 max-w-[200px] truncate">
                      {item.css_value}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => updateMut.mutate({ id: item.id, data: { is_available: !item.is_available } })}
                        className="flex items-center gap-1.5 text-xs font-bold"
                      >
                        {item.is_available ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ToggleRight className="w-5 h-5 text-emerald-400" /> Active
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <ToggleLeft className="w-5 h-5 text-gray-500" /> Hidden
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/10"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => deleteMut.mutate(item.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Shop Cosmetic">
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {formError && (
              <p className="text-xs font-bold text-danger bg-danger/10 p-3 rounded-xl border border-danger/20">
                {formError}
              </p>
            )}

            <Input
              label="Item Name *"
              placeholder="e.g. Neon Cyber Ring"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <Textarea
              label="Description"
              placeholder="Brief description of the cosmetic reward..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ShopCategory)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="avatar_frame" className="bg-gaming-card">Avatar Frame</option>
                  <option value="name_color" className="bg-gaming-card">Name Color</option>
                  <option value="profile_border" className="bg-gaming-card">Profile Border</option>
                  <option value="seasonal" className="bg-gaming-card">Seasonal Item</option>
                </select>
              </div>

              <Input
                label="Price (Points) *"
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
              />
            </div>

            <Input
              label="CSS Style / Class *"
              placeholder="e.g. ring-2 ring-accent-neon shadow-[0_0_15px_#00f0ff]"
              value={cssValue}
              onChange={e => setCssValue(e.target.value)}
              required
            />

            <Input
              label="Season Tag (Optional)"
              placeholder="e.g. Season 4"
              value={season}
              onChange={e => setSeason(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={createMut.isPending}>
                Create Item
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
