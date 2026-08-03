'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/audit';
import { revalidatePath } from 'next/cache';
import type { SponsorTier } from '@/lib/types/database';

export async function fetchSponsors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchSponsors error:', error.message);
    return [];
  }

  return data || [];
}

export async function createSponsor(data: {
  name: string;
  tier: SponsorTier;
  logo_url: string;
  website_url?: string | null;
  description?: string | null;
  sort_order?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Require admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  if (!data.name || data.name.trim().length === 0) throw new Error('Sponsor name is required.');
  if (!data.logo_url || data.logo_url.trim().length === 0) throw new Error('Logo URL is required.');

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .insert({
      name: data.name.trim(),
      tier: data.tier,
      logo_url: data.logo_url.trim(),
      website_url: data.website_url?.trim() || null,
      description: data.description?.trim() || null,
      sort_order: data.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'create_sponsor', 'sponsor', sponsor.id, { name: data.name });
  revalidatePath('/sponsors');
  revalidatePath('/admin/sponsors');
  return sponsor;
}

export async function updateSponsor(id: string, data: Partial<{
  name: string;
  tier: SponsorTier;
  logo_url: string;
  website_url: string | null;
  description: string | null;
  sort_order: number;
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
    .from('sponsors')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'update_sponsor', 'sponsor', id, data);
  revalidatePath('/sponsors');
  revalidatePath('/admin/sponsors');
}

export async function deleteSponsor(id: string) {
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
    .from('sponsors')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'delete_sponsor', 'sponsor', id, {});
  revalidatePath('/sponsors');
  revalidatePath('/admin/sponsors');
}
