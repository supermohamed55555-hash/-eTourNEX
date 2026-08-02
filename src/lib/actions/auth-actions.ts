'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Shown for every failed sign-in, whatever the underlying cause: unknown
 * username, unknown email, or wrong password. Keeping a single message means
 * the response can't be used to test whether an account exists.
 */
const GENERIC_AUTH_ERROR =
  'Invalid credentials. Please check your email/username and password.';

/**
 * Sign in with either an email address or a username.
 *
 * When the identifier is a username it is resolved to an email server-side,
 * using the service-role client (the `get_user_email_by_username` RPC is no
 * longer callable by `anon` — see supabase/migrations/003_lock_email_lookup.sql).
 * The resolved email is never returned to the caller.
 *
 * On success, session cookies are written by the cookie-bound server client.
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string
): Promise<{ error: string | null }> {
  const trimmed = identifier.trim();

  if (!trimmed || !password) {
    return { error: GENERIC_AUTH_ERROR };
  }

  let email = trimmed;

  // No '@' means it's a username — resolve it to an email.
  if (!email.includes('@')) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('get_user_email_by_username', {
        lookup_username: email,
      });

      if (error || !data) {
        return { error: GENERIC_AUTH_ERROR };
      }

      email = data as string;
    } catch {
      // Missing/invalid service-role key, or the RPC is unreachable.
      return { error: GENERIC_AUTH_ERROR };
    }
  }

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: GENERIC_AUTH_ERROR };
  }

  return { error: null };
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
