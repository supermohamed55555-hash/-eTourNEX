'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(data: {
  display_name?: string;
  country?: string;
  bio?: string;
  avatar_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only allow specific fields to be updated
  const allowedUpdates: Record<string, any> = {};
  if (data.display_name !== undefined) allowedUpdates.display_name = data.display_name;
  if (data.country !== undefined) allowedUpdates.country = data.country;
  if (data.bio !== undefined) allowedUpdates.bio = data.bio;
  if (data.avatar_url !== undefined) allowedUpdates.avatar_url = data.avatar_url;

  if (Object.keys(allowedUpdates).length === 0) return;

  const { error } = await supabase
    .from('profiles')
    .update(allowedUpdates)
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
}
