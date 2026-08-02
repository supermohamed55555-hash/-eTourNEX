-- eTourNEX — Lock down the username→email lookup RPC
-- Apply after 002_hardening.sql
--
-- 002 granted EXECUTE on get_user_email_by_username to `anon`, which let any
-- caller holding the (public, client-side) anon key resolve a username to the
-- account's real email address with a single REST call. This migration makes
-- the function callable only by `service_role`, so the lookup can only happen
-- server-side via src/lib/supabase/admin.ts.

-- ═══════════════════════════════════════════════════════════════
-- 1. RECREATE THE FUNCTION WITH A PINNED search_path
-- ═══════════════════════════════════════════════════════════════
-- A SECURITY DEFINER function without a fixed search_path can be hijacked: a
-- caller who can create objects in a schema earlier on the resolution path can
-- shadow `profiles` (or an operator/cast the body relies on) and have it run
-- with the definer's privileges. Pinning search_path closes that.

CREATE OR REPLACE FUNCTION get_user_email_by_username(lookup_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT u.email INTO user_email
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(lookup_username);

  RETURN user_email;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. RESTRICT EXECUTE TO service_role ONLY
-- ═══════════════════════════════════════════════════════════════
-- CREATE OR REPLACE preserves existing grants, so the anon/authenticated grants
-- from 002 survive the redefinition above and must be revoked explicitly.
-- PUBLIC is revoked as well: EXECUTE is granted to PUBLIC by default on new
-- functions, and that default grant is what makes an unauthenticated REST call
-- succeed even with no role-specific grant present.

REVOKE EXECUTE ON FUNCTION get_user_email_by_username(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_email_by_username(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_email_by_username(TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFY
-- ═══════════════════════════════════════════════════════════════
-- Expected: a single row, {service_role}. If anon or authenticated still
-- appear, the revokes above did not match the function signature.
--
--   SELECT p.proname, p.proacl
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname = 'get_user_email_by_username';
