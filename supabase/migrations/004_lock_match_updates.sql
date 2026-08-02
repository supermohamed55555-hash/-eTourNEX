-- eTourNEX — Constrain player-initiated match updates
-- Apply after 003_lock_email_lookup.sql
--
-- schema.sql:147 defines the player UPDATE policy with USING but no WITH CHECK.
-- Postgres reuses USING as WITH CHECK in that case, so the only thing verified
-- is "caller is a participant in this match" — both before AND after the write.
-- A participant could therefore PATCH /rest/v1/matches?id=eq.<x> with
--   {"status":"confirmed","winner_id":"<their own participant id>"}
-- and award themselves any match they are in, bypassing match-actions.ts.
--
-- Two layers here, because they close different holes:
--   1. The POLICY constrains the NEW row (winner_id/confirmed_by stay NULL,
--      status lands on a player-legal value).
--   2. The TRIGGER compares OLD to NEW. RLS WITH CHECK cannot see the OLD row,
--      so it structurally cannot stop a participant from rewriting
--      player_b_id, tournament_id, next_match_id, etc. Only a trigger can.
-- Neither layer is redundant. Do not drop one as "belt and braces".

-- ═══════════════════════════════════════════════════════════════
-- 0. PRE-FLIGHT DATA FIX
-- ═══════════════════════════════════════════════════════════════
-- rejectMatch (match-actions.ts:111-121) resets score/proof/status/reported_by
-- and winner_id, but NOT confirmed_by. A match that was confirmed and then
-- rejected therefore sits at status='scheduled' with confirmed_by still set.
-- The new policy requires confirmed_by IS NULL on any player write, so those
-- rows would become permanently un-reportable — the players involved would see
-- a silent failure with no way forward.
--
-- Clear the stale value. confirmed_by is only meaningful on a confirmed match.
-- (See Item 9 in SECURITY_BACKLOG.md for the matching code fix.)

UPDATE matches
SET confirmed_by = NULL
WHERE status <> 'confirmed'
  AND confirmed_by IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 1. REPLACE THE PLAYER UPDATE POLICY
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Players can report match results for their matches" ON matches;

CREATE POLICY "Players can report match results for their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    -- OLD row: an un-adjudicated match the caller is a participant in.
    -- Excluding 'confirmed' makes post-confirmation disputes admin-only.
    status IN ('scheduled', 'pending_review')
    AND EXISTS (
      SELECT 1 FROM tournament_participants tp
      WHERE (tp.id = matches.player_a_id OR tp.id = matches.player_b_id)
        AND tp.player_id = auth.uid()
    )
  )
  WITH CHECK (
    -- NEW row: adjudication fields untouched. Only confirmMatch, running under
    -- the admin FOR ALL policy, may ever set these.
    winner_id IS NULL
    AND confirmed_by IS NULL
    AND (
      -- Exactly two player-legal outcomes.
      -- reported_by is pinned to the caller on report, so a result cannot be
      -- attributed to the opponent. It is NOT required on the dispute branch:
      -- the disputer is normally the other player, and reported_by must keep
      -- pointing at whoever filed the original result.
      (status = 'pending_review' AND reported_by = auth.uid())
      OR status = 'disputed'
    )
    AND EXISTS (
      SELECT 1 FROM tournament_participants tp
      WHERE (tp.id = matches.player_a_id OR tp.id = matches.player_b_id)
        AND tp.player_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. OLD/NEW ENFORCEMENT TRIGGER
-- ═══════════════════════════════════════════════════════════════
-- Restricts non-admin callers to the five columns a player legitimately writes:
-- score_a, score_b, proof_screenshot_url, status, reported_by.

CREATE OR REPLACE FUNCTION public.enforce_match_update_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- service_role and SQL Editor (auth.uid() IS NULL) are unrestricted, as is
  -- any admin — confirmMatch/rejectMatch/advanceWinner all run under an admin
  -- session and legitimately rewrite winner_id, confirmed_by and the
  -- player_a_id/player_b_id slots of the *next* match in the bracket.
  IF auth.uid() IS NULL
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  THEN
    RETURN NEW;
  END IF;

  IF NEW.id             IS DISTINCT FROM OLD.id
     OR NEW.tournament_id  IS DISTINCT FROM OLD.tournament_id
     OR NEW.round_name     IS DISTINCT FROM OLD.round_name
     OR NEW.round_order    IS DISTINCT FROM OLD.round_order
     OR NEW.player_a_id    IS DISTINCT FROM OLD.player_a_id
     OR NEW.player_b_id    IS DISTINCT FROM OLD.player_b_id
     OR NEW.next_match_id  IS DISTINCT FROM OLD.next_match_id
     OR NEW.scheduled_for  IS DISTINCT FROM OLD.scheduled_for
     OR NEW.created_at     IS DISTINCT FROM OLD.created_at
     OR NEW.winner_id      IS DISTINCT FROM OLD.winner_id
     OR NEW.confirmed_by   IS DISTINCT FROM OLD.confirmed_by
  THEN
    RAISE EXCEPTION 'Players may only modify score_a, score_b, proof_screenshot_url, status and reported_by';
  END IF;

  -- A dispute is a pure status flip. disputeMatch (match-actions.ts:138-143)
  -- sends status alone, but the policy's dispute branch does not pin the other
  -- columns, so without this a player could rewrite the scores and proof URL
  -- on their way into dispute — handing the reviewing admin doctored evidence.
  IF NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed' THEN
    IF NEW.score_a IS DISTINCT FROM OLD.score_a
       OR NEW.score_b IS DISTINCT FROM OLD.score_b
       OR NEW.proof_screenshot_url IS DISTINCT FROM OLD.proof_screenshot_url
       OR NEW.reported_by IS DISTINCT FROM OLD.reported_by
    THEN
      RAISE EXCEPTION 'A dispute may only change status; scores and proof must stand as reported';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_match_update_scope ON matches;

CREATE TRIGGER trg_enforce_match_update_scope
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_match_update_scope();

-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- Run separately after applying. Expect qual AND with_check both populated —
-- a NULL with_check means the WITH CHECK did not attach and the hole is open.

-- SELECT polname, permissive, roles, qual, with_check
-- FROM pg_policy
-- WHERE polrelid = 'matches'::regclass
--   AND polname = 'Players can report match results for their matches';

-- Expect one row, tgenabled = 'O' (enabled, origin):
-- SELECT tgname, tgenabled
-- FROM pg_trigger
-- WHERE tgrelid = 'matches'::regclass
--   AND tgname = 'trg_enforce_match_update_scope';
