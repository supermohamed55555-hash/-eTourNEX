'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/actions/interaction-actions';
import type { ShopCategory, ShopItem } from '@/lib/types/database';

export async function fetchShopItems(category?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('shop_items')
    .select('*')
    .eq('is_available', true)
    .order('price', { ascending: true });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function fetchAllShopItemsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Admin access required');

  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function fetchPlayerInventory(playerId?: string) {
  const supabase = await createClient();
  let targetId = playerId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from('player_inventory')
    .select('*, item:shop_items(*)')
    .eq('player_id', targetId);

  if (error) return [];
  return data || [];
}

export async function fetchPlayerEquipped(playerId?: string) {
  const supabase = await createClient();
  let targetId = playerId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from('player_equipped_items')
    .select('*, avatar_frame:shop_items!avatar_frame_id(*), name_color:shop_items!name_color_id(*), profile_border:shop_items!profile_border_id(*)')
    .eq('player_id', targetId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function purchaseShopItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please sign in to purchase items.');

  // 1. Fetch item details
  const { data: item } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (!item || !item.is_available) {
    throw new Error('This cosmetic item is currently unavailable.');
  }

  // 2. Check if already owned
  const { data: existingOwned } = await supabase
    .from('player_inventory')
    .select('id')
    .eq('player_id', user.id)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existingOwned) {
    throw new Error('You already permanently own this cosmetic item.');
  }

  // 3. Check player points balance
  const { data: lbEntry } = await supabase
    .from('leaderboard_entries')
    .select('points')
    .eq('player_id', user.id)
    .maybeSingle();

  const currentPoints = lbEntry?.points ?? 0;

  if (currentPoints < item.price) {
    throw new Error(`Insufficient points balance. You need ${item.price} pts (you have ${currentPoints} pts).`);
  }

  // 4. Deduct points from leaderboard_entries
  const newPoints = currentPoints - item.price;
  if (lbEntry) {
    await supabase
      .from('leaderboard_entries')
      .update({ points: newPoints })
      .eq('player_id', user.id);
  } else {
    await supabase
      .from('leaderboard_entries')
      .insert({ player_id: user.id, points: newPoints });
  }

  // 5. Record negative points transaction
  await supabase
    .from('points_transactions')
    .insert({
      player_id: user.id,
      points: -item.price,
      reason: `Purchased cosmetic: ${item.name}`,
    });

  // 6. Add to player_inventory
  const { error: invError } = await supabase
    .from('player_inventory')
    .insert({
      player_id: user.id,
      item_id: item.id,
    });

  if (invError) throw new Error(invError.message);

  // 7. Send Notification
  await sendNotification({
    playerId: user.id,
    title: '🛍️ Item Unlocked!',
    message: `You successfully unlocked "${item.name}" for ${item.price} points.`,
    type: 'points_earned',
    linkUrl: '/shop',
    referenceId: `shop_${item.id}_${user.id}`,
  });

  revalidatePath('/shop');
  revalidatePath('/leaderboard');
  revalidatePath(`/players`);
  return { success: true, remainingPoints: newPoints };
}

export async function equipCosmeticItem(itemId: string, slot: 'avatar_frame' | 'name_color' | 'profile_border') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify ownership
  const { data: owned } = await supabase
    .from('player_inventory')
    .select('id')
    .eq('player_id', user.id)
    .eq('item_id', itemId)
    .maybeSingle();

  if (!owned) {
    throw new Error('You do not own this cosmetic item.');
  }

  const columnMap: Record<string, string> = {
    avatar_frame: 'avatar_frame_id',
    name_color: 'name_color_id',
    profile_border: 'profile_border_id',
  };

  const updateCol = columnMap[slot];
  if (!updateCol) throw new Error('Invalid cosmetic slot.');

  // Fetch or create equipped record
  const { data: existing } = await supabase
    .from('player_equipped_items')
    .select('id')
    .eq('player_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('player_equipped_items')
      .update({
        [updateCol]: itemId,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', user.id);
  } else {
    await supabase
      .from('player_equipped_items')
      .insert({
        player_id: user.id,
        [updateCol]: itemId,
      });
  }

  revalidatePath('/shop');
  revalidatePath('/leaderboard');
  revalidatePath(`/players`);
}

export async function unequipCosmeticItem(slot: 'avatar_frame' | 'name_color' | 'profile_border') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const columnMap: Record<string, string> = {
    avatar_frame: 'avatar_frame_id',
    name_color: 'name_color_id',
    profile_border: 'profile_border_id',
  };

  const updateCol = columnMap[slot];
  if (!updateCol) throw new Error('Invalid cosmetic slot.');

  await supabase
    .from('player_equipped_items')
    .update({
      [updateCol]: null,
      updated_at: new Date().toISOString(),
    })
    .eq('player_id', user.id);

  revalidatePath('/shop');
  revalidatePath('/leaderboard');
  revalidatePath(`/players`);
}

// ─── ADMIN SHOP CMS ────────────────────────────────────────────────────

export async function createShopItem(data: {
  name: string;
  description?: string;
  category: ShopCategory;
  price: number;
  css_value: string;
  image_url?: string;
  season?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Admin access required');

  if (!data.name || data.price <= 0 || !data.css_value) {
    throw new Error('Valid name, positive price, and CSS style value are required.');
  }

  const { data: item, error } = await supabase
    .from('shop_items')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      category: data.category,
      price: Number(data.price),
      css_value: data.css_value.trim(),
      image_url: data.image_url?.trim() || null,
      season: data.season?.trim() || null,
      is_available: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/shop');
  revalidatePath('/admin/shop');
  return item;
}

export async function updateShopItem(id: string, data: Partial<ShopItem>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Admin access required');

  const { error } = await supabase
    .from('shop_items')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/shop');
  revalidatePath('/admin/shop');
}

export async function deleteShopItem(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Admin access required');

  const { error } = await supabase
    .from('shop_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/shop');
  revalidatePath('/admin/shop');
}
