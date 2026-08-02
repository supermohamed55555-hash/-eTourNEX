-- eTourNEX — Allow admins to update tournament participants
-- Apply after 005_storage_match_proofs.sql
--
-- SECURITY_BACKLOG.md Item 8.
--
-- `advanceWinner` (src/lib/actions/match-actions.ts:162-166) marks the losing
-- participant eliminated after an admin confirms a match:
--
--     await supabase
--       .from('tournament_participants')
--       .update({ eliminated: true })
--       .eq('id', loserId);
--
-- schema.sql:130-143 gives tournament_participants a SELECT, an INSERT and a
-- DELETE policy — but no UPDATE policy, and no admin `FOR ALL` policy of the
-- kind matches (schema.sql:153) and leaderboard_entries (schema.sql:159) have.
-- With RLS enabled and no UPDATE policy to match against, Postgres filters the
-- statement down to zero rows. It does NOT raise: an UPDATE that touches
-- nothing is a successful UPDATE. The call also discards its result, so nothing
-- surfaced at runtime.
--
-- Confirmed against the live database before writing this migration:
--   confirmed matches = 1, participants with eliminated = true = 0.
--
-- Two parts here, and the order matters:
--   1. BACKFILL the rows the bug has already corrupted. Do this while the
--      policy is still absent — it runs in the SQL Editor as the service role,
--      which bypasses RLS entirely, so it is unaffected either way.
--   2. ADD the policy so future confirmations work.
--
-- Why FOR UPDATE and not FOR ALL (backlog option (a)):
--   A `FOR ALL` admin policy would also hand admins INSERT and DELETE on this
--   table. Both are already deliberately scoped in schema.sql — registration is
--   restricted to email-confirmed players acting on their own behalf
--   (schema.sql:132), and withdrawal is restricted to the registration window
--   (schema.sql:138). Widening those as a side effect of fixing an UPDATE bug
--   is a bigger change than the bug calls for. FOR UPDATE is the smallest
--   policy that closes it.
--
-- Why not a service-role client (backlog option (b)):
--   src/lib/supabase/admin.ts documents itself as sign-in username→email
--   resolution only. Routing bracket advancement through it would bypass RLS
--   for the entire confirm path, so every future bug in that path loses its
--   last line of defence. The caller is already an authenticated admin —
--   confirmMatch verifies role at match-actions.ts:45-50 — so there is nothing
--   here that needs to escape RLS.
--
-- Why the policy is not narrowed to the `eliminated` column (option (c)):
--   RLS predicates evaluate whole rows; they cannot restrict which columns an
--   UPDATE touches. Column-scoping needs either a trigger (as 004 does for
--   matches) or column-level GRANTs. That is worth doing if players ever get
--   UPDATE here, but for an admin-only policy it guards against nothing an
--   admin cannot already do through the admin panel.

-- ═══════════════════════════════════════════════════════════════
-- 1. BACKFILL
-- ═══════════════════════════════════════════════════════════════
-- Every participant who lost a confirmed match should be flagged. Derived from
-- matches rather than hardcoded, so this is correct whatever the current data
-- looks like, and safe to re-run.
--
-- Restricted to status = 'confirmed' with a non-null winner_id: a pending_review
-- or disputed match has no adjudicated loser yet, and a rejected match returns
-- to 'scheduled' with winner_id cleared (match-actions.ts:112-122).

UPDATE tournament_participants tp
SET eliminated = true
WHERE tp.eliminated = false
  AND EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.status = 'confirmed'
      AND m.winner_id IS NOT NULL
      AND (tp.id = m.player_a_id OR tp.id = m.player_b_id)
      AND tp.id <> m.winner_id
  );

-- Expected on the current database: UPDATE 1  (the S7S participant row).

-- ═══════════════════════════════════════════════════════════════
-- 2. ADMIN UPDATE POLICY
-- ═══════════════════════════════════════════════════════════════
-- Mirrors the admin-check shape used throughout schema.sql. The profiles
-- subquery is safe from RLS recursion: profiles' own SELECT policy is
-- `using (true)` (schema.sql:106), so it does not re-enter this policy.
--
-- WITH CHECK repeats the USING predicate rather than being omitted. Postgres
-- would reuse USING as WITH CHECK by default, but 004 was written after exactly
-- that implicit behaviour turned into a hole on matches. Stating both is
-- explicit about the intent: an admin before the write, an admin after it.

DROP POLICY IF EXISTS "Admins can update participants" ON tournament_participants;

CREATE POLICY "Admins can update participants"
  ON tournament_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- Run separately after applying.

-- (a) Backfill landed. Expect one row per loser of a confirmed match —
--     currently 1, the S7S participant.
-- SELECT tp.id, p.username, tp.eliminated
-- FROM tournament_participants tp
-- JOIN profiles p ON p.id = tp.player_id
-- ORDER BY tp.eliminated DESC, p.username;

-- (b) Policy attached, with both qual and with_check populated.
-- SELECT polname, permissive, roles, qual, with_check
-- FROM pg_policy
-- WHERE polrelid = 'tournament_participants'::regclass
--   AND polname = 'Admins can update participants';

-- (c) Full policy set on the table. Expect four: the three from schema.sql
--     (select/insert/delete) plus this one. If UPDATE appears more than once,
--     something re-added a broader policy and least-privilege is gone.
-- SELECT polname, polcmd
-- FROM pg_policy
-- WHERE polrelid = 'tournament_participants'::regclass
-- ORDER BY polcmd;
