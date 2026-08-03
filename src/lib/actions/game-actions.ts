'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/audit';
import { revalidatePath } from 'next/cache';

export async function fetchAllGames(category?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('games')
    .select('*')
    .order('name', { ascending: true });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchAllGames error:', error.message);
    return [];
  }

  return data || [];
}

export async function createGame(data: {
  name: string;
  category: string;
  publisher?: string | null;
  icon_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  if (!data.name || data.name.trim().length === 0) throw new Error('Game name is required.');

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      name: data.name.trim(),
      slug,
      category: data.category || 'Sports',
      publisher: data.publisher?.trim() || null,
      icon_url: data.icon_url?.trim() || '🎮',
      banner_url: data.banner_url?.trim() || null,
      color: data.color?.trim() || '#8B5CF6',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'create_game', 'game', game.id, { name: data.name });
  revalidatePath('/tournaments');
  revalidatePath('/admin/games');
  revalidatePath('/games');
  return game;
}

export async function updateGame(id: string, data: Partial<{
  name: string;
  category: string;
  publisher: string | null;
  icon_url: string | null;
  banner_url: string | null;
  color: string | null;
  is_active: boolean;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  const { error } = await supabase
    .from('games')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'update_game', 'game', id, data);
  revalidatePath('/tournaments');
  revalidatePath('/admin/games');
}

export async function deleteGame(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'delete_game', 'game', id, {});
  revalidatePath('/tournaments');
  revalidatePath('/admin/games');
}
