'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Look up a user's email by their username.
 * Requires the `get_user_email_by_username` RPC function in the database.
 * Falls back gracefully if the function doesn't exist yet.
 */
export async function lookupEmailByUsername(username: string): Promise<{ email: string | null; error: string | null }> {
  const supabase = await createClient();

  // Try the RPC function that queries auth.users via SECURITY DEFINER
  const { data, error } = await supabase
    .rpc('get_user_email_by_username', { lookup_username: username });

  if (error || !data) {
    return {
      email: null,
      error: 'Username not found. Please try logging in with your email address.',
    };
  }

  return { email: data as string, error: null };
}

/**
 * Check if a username is already taken.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return !data; // available if no row found
}
