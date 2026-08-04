'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import {
  fetchShopItems, fetchPlayerInventory, fetchPlayerEquipped,
  purchaseShopItem, equipCosmeticItem, unequipCosmeticItem
} from '@/lib/actions/shop-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ShoppingBag, Sparkles, CheckCircle2, ShieldCheck, Flame,
  Crown, Palette, Image as ImageIcon, Star, Check, Zap, Info, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopItem, ShopCategory } from '@/lib/types/database';

const CATEGORIES: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all',             label: 'All Items',       icon: ShoppingBag },
  { id: 'avatar_frame',    label: 'Avatar Frames',   icon: Sparkles },
  { id: 'name_color',      label: 'Name Colors',     icon: Palette },
  { id: 'profile_border',  label: 'Profile Borders', icon: ImageIcon },
  { id: 'seasonal',        label: 'Seasonal',        icon: Crown },
];

export default function ShopPage() {
  const { profile: user } = useAuth();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [purchaseModalItem, setPurchaseModalItem] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: shopItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['shop-items', activeCategory],
    queryFn: () => fetchShopItems(activeCategory),
  });

  const { data: inventory = [], isLoading: loadingInv } = useQuery({
    queryKey: ['player-inventory', user?.id],
    queryFn: () => fetchPlayerInventory(user?.id),
    enabled: !!user?.id,
  });

  const { data: equipped, isLoading: loadingEq } = useQuery({
    queryKey: ['player-equipped', user?.id],
    queryFn: () => fetchPlayerEquipped(user?.id),
    enabled: !!user?.id,
  });

  // Owned item IDs
  const ownedItemIds = new Set(inventory.map((inv: any) => inv.item_id));

  // Mutations
  const buyMutation = useMutation({
    mutationFn: (itemId: string) => purchaseShopItem(itemId),
    onSuccess: (res) => {
      setMessage({ type: 'success', text: 'Cosmetic item unlocked successfully!' });
      setPurchaseModalItem(null);
      queryClient.invalidateQueries({ queryKey: ['player-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
    },
    onError: (err: Error) => {
      setMessage({ type: 'error', text: err.message });
    },
  });

  const equipMutation = useMutation({
    mutationFn: ({ itemId, slot }: { itemId: string; slot: any }) => equipCosmeticItem(itemId, slot),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Cosmetic equipped!' });
      queryClient.invalidateQueries({ queryKey: ['player-equipped'] });
    },
    onError: (err: Error) => {
      setMessage({ type: 'error', text: err.message });
    },
  });

  const unequipMutation = useMutation({
    mutationFn: (slot: any) => unequipCosmeticItem(slot),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Cosmetic unequipped!' });
      queryClient.invalidateQueries({ queryKey: ['player-equipped'] });
    },
  });

  const getSlot = (item: ShopItem) => {
    if (item.category === 'seasonal') return 'avatar_frame';
    return item.category as 'avatar_frame' | 'name_color' | 'profile_border';
  };

  const isEquipped = (item: ShopItem) => {
    if (!equipped) return false;
    return (
      equipped.avatar_frame_id === item.id ||
      equipped.name_color_id === item.id ||
      equipped.profile_border_id === item.id
    );
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-r from-purple-900/60 via-gaming-card to-blue-900/60 border border-white/10 shadow-glass">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
              <ShoppingBag className="w-3.5 h-3.5" /> COSMETIC REWARDS SHOP
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Points <span className="brand-text">Cosmetics Store</span>
            </h1>
            <p className="text-gray-300 text-sm mt-1 max-w-xl">
              Spend your tournament reward points on avatar frames, custom glowing name colors, and exclusive profile borders. Pure cosmetics, 0% pay-to-win!
            </p>
          </div>

          {/* User Points Badge */}
          {user && (
            <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-amber-300 font-semibold uppercase">Your Points</p>
                <p className="text-2xl font-black text-white">Points Store Available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={cn(
          'p-4 rounded-xl text-sm font-medium border flex items-center justify-between',
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-danger/10 border-danger/30 text-danger'
        )}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2 shrink-0',
                active
                  ? 'bg-primary-600 text-white shadow-purple-glow-sm'
                  : 'glass text-gray-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cosmetic Items Grid */}
      {loadingItems ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : shopItems.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl space-y-3">
          <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-gray-400">No cosmetic items in this category</h3>
          <p className="text-gray-600 text-xs">Check back soon for new seasonal rewards!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shopItems.map((item: ShopItem) => {
            const owned = ownedItemIds.has(item.id);
            const equippedItem = isEquipped(item);

            return (
              <div
                key={item.id}
                className={cn(
                  'glass-card rounded-2xl border p-5 flex flex-col justify-between transition-all group hover:scale-[1.02]',
                  equippedItem
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : owned
                    ? 'border-primary-500/40 bg-primary-500/5'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                {/* Top Badge & Season Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant={equippedItem ? 'verified' : owned ? 'gold' : 'new'}>
                    {equippedItem ? 'EQUIPPED' : owned ? 'OWNED' : item.category.replace('_', ' ')}
                  </Badge>
                  {item.season && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {item.season}
                    </span>
                  )}
                </div>

                {/* Cosmetic Preview Window */}
                <div className="my-3 py-6 px-4 rounded-xl bg-gaming-dark/60 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group-hover:bg-gaming-dark/80 transition-colors">
                  {/* Avatar Frame Preview */}
                  {item.category === 'avatar_frame' || item.category === 'seasonal' ? (
                    <div className={cn('p-1 rounded-full transition-all duration-300', item.css_value)}>
                      <Avatar
                        src={user?.avatar_url}
                        alt={user?.username || 'Player'}
                        seed={user?.username || 'Player'}
                        size="md"
                      />
                    </div>
                  ) : item.category === 'name_color' ? (
                    /* Name Color Preview */
                    <div className="text-center">
                      <p className={cn('text-lg font-black tracking-tight', item.css_value)}>
                        {user?.username || 'EsportsPlayer'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">Name Color Preview</p>
                    </div>
                  ) : (
                    /* Profile Border Preview */
                    <div className={cn('w-full py-3 px-4 rounded-xl text-center bg-white/3', item.css_value)}>
                      <p className="text-xs font-bold text-white">Profile Card Border</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1 my-2">
                  <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{item.description || 'Cosmetic item'}</p>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>{item.price} pts</span>
                  </div>

                  <div className="flex gap-2">
                    {/* Preview Button */}
                    <button
                      onClick={() => setPreviewItem(item)}
                      title="Preview on Profile"
                      className="p-2 rounded-xl glass hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Action Button */}
                    {equippedItem ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unequipMutation.mutate(getSlot(item))}
                        loading={unequipMutation.isPending}
                      >
                        Unequip
                      </Button>
                    ) : owned ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => equipMutation.mutate({ itemId: item.id, slot: getSlot(item) })}
                        loading={equipMutation.isPending}
                      >
                        Equip
                      </Button>
                    ) : (
                      <Button
                        variant="neon"
                        size="sm"
                        icon={<ShoppingBag className="w-3.5 h-3.5" />}
                        onClick={() => setPurchaseModalItem(item)}
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Interactive Preview Modal */}
      {previewItem && (
        <Modal
          open={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={`Preview: ${previewItem.name}`}
        >
          <div className="space-y-6 text-center py-4">
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4 max-w-sm mx-auto">
              <div className="flex flex-col items-center space-y-3">
                <div className={cn('p-1 rounded-full', previewItem.category === 'avatar_frame' && previewItem.css_value)}>
                  <Avatar
                    src={user?.avatar_url}
                    alt={user?.username || 'Player'}
                    seed={user?.username || 'Player'}
                    size="lg"
                  />
                </div>
                <h4 className={cn('text-xl font-black', previewItem.category === 'name_color' ? previewItem.css_value : 'text-white')}>
                  {user?.username || 'Pro Gamer'}
                </h4>
                <Badge variant="verified">Competitor</Badge>
              </div>

              <div className="pt-3 border-t border-white/10 text-xs text-gray-400">
                <p>{previewItem.description}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="ghost" onClick={() => setPreviewItem(null)}>
                Close Preview
              </Button>
              {!ownedItemIds.has(previewItem.id) && (
                <Button
                  variant="neon"
                  icon={<ShoppingBag className="w-4 h-4" />}
                  onClick={() => {
                    setPurchaseModalItem(previewItem);
                    setPreviewItem(null);
                  }}
                >
                  Buy for {previewItem.price} pts
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Purchase Confirm Modal */}
      {purchaseModalItem && (
        <Modal
          open={!!purchaseModalItem}
          onClose={() => setPurchaseModalItem(null)}
          title={`Confirm Purchase: ${purchaseModalItem.name}`}
        >
          <div className="space-y-6 py-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-bold text-white">{purchaseModalItem.name}</p>
                <p className="text-xs text-gray-400">{purchaseModalItem.category.replace('_', ' ')}</p>
                <p className="text-sm font-extrabold text-amber-400 mt-1">{purchaseModalItem.price} points</p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Purchasing this cosmetic item is permanent. Points will be deducted from your account.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setPurchaseModalItem(null)}>
                Cancel
              </Button>
              <Button
                variant="neon"
                icon={<ShoppingBag className="w-4 h-4" />}
                onClick={() => buyMutation.mutate(purchaseModalItem.id)}
                loading={buyMutation.isPending}
              >
                Confirm Purchase ({purchaseModalItem.price} pts)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
