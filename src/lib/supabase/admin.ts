import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — BYPASSES ROW LEVEL SECURITY.
 *
 * ⚠️  SERVER-SIDE ONLY. Never import this module from a Client Component, or
 * from any module a Client Component pulls in. `SUPABASE_SERVICE_ROLE_KEY` is
 * deliberately not `NEXT_PUBLIC_` prefixed, so importing this into client code
 * does not merely leak the key — the env var is undefined in the browser bundle
 * and the call below throws. Keep it behind `'use server'` actions or route
 * handlers.
 *
 * Currently used only to resolve a username to an email during sign-in
 * (see src/lib/actions/auth-actions.ts). The resolved email must never be
 * returned to the caller.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from ' +
        'Supabase Dashboard → Settings → API (service_role secret).'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // This client is never a user session — don't touch cookies or storage,
      // and don't spin up a background token refresh timer.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
