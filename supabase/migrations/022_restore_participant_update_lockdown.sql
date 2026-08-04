-- eTourNEX — Restore the Item 8 posture on tournament_participants,
--            and unbreak organizer bracket management on matches.
-- Apply after 021_points_shop.sql
--
-- Two independent fixes, both regressions introduced by 011/019:
--
--   PART 1 — 019 replaced the admin-only UPDATE path on
--   tournament_participants with a FOR ALL policy whose USING clause ORs in
--   `player_id = auth.uid()`. That is the exact option SECURITY_BACKLOG Item 8
--   evaluated and rejected by name. Net effect: a player can PATCH their own
--   participant row and set `eliminated = false`. Unlike `matches`, there is no
--   OLD/NEW trigger on this table to catch it — 002's
--   enforce_tournament_registration is BEFORE INSERT only.
--
--   PART 2 — 011/019 grant tournament creators FOR ALL on `matches`, but 004's
--   enforce_match_update_scope trigger only exempts admins. An organizer
--   therefore passes RLS and is then rejected by the trigger. This is not
--   theoretical: generateBracket (admin-actions.ts:72 gates on
--   requireAdminOrOrganizer) runs `UPDATE matches SET next_match_id` at
--   admin-actions.ts:228, which the trigger blocks with a message about
--   players.
--
-- 004's header says its policy and trigger close different holes and neither is
-- redundant. That still holds — this migration widens the trigger's exemption
-- by role, it does not remove a layer.

-- ═══════════════════════════════════════════════════════════════
-- PART 1. tournament_participants — drop the FOR ALL, restate as
--         SELECT / INSERT / DELETE only
-- ═══════════════════════════════════════════════════════════════
-- UPDATE is deliberately absent. Migration 006's "Admins can update
-- participants" (FOR UPDATE, admin-only) becomes the sole UPDATE path again,
-- which is the posture Item 8 settled on. Policies are OR'd, so leaving any
-- player-reachable UPDATE branch here would re-open the hole no matter how
-- narrow 006 is.

DROP POLICY IF EXISTS "Organizers or creators can manage participants" ON public.tournament_participants;

-- SELECT — currently subsumed by schema.sql's "Participants readable by
-- everyone" (USING true). Stated anyway so the organizer grant is complete on
-- its own terms: if that public-read policy is ever narrowed, organizer and
-- creator visibility should not silently disappear with it.
DROP POLICY IF EXISTS "Organizers or creators can view participants" ON public.tournament_participants;
CREATE POLICY "Organizers or creators can view participants" ON public.tournament_participants
  FOR SELECT USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_participants.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- INSERT — organizer/creator seeding. The player self-registration path stays
-- with schema.sql's "Confirmed players can register for tournaments", which
-- additionally requires email_confirmed; that check is NOT duplicated here on
-- purpose, so this policy cannot be used to bypass it. FOR INSERT takes
-- WITH CHECK only (there is no OLD row).
DROP POLICY IF EXISTS "Organizers or creators can add participants" ON public.tournament_participants;
CREATE POLICY "Organizers or creators can add participants" ON public.tournament_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_participants.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- DELETE — organizer/creator removal (removeParticipantByOrganizer). No status
-- condition here: an admin must be able to disqualify mid-tournament. The
-- registration-phase restriction for organizers is enforced in code at
-- organizer-actions.ts:109-111.
DROP POLICY IF EXISTS "Organizers or creators can remove participants" ON public.tournament_participants;
CREATE POLICY "Organizers or creators can remove participants" ON public.tournament_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_participants.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- BEHAVIOUR CHANGE — player self-removal reverts to registration-phase only.
-- 019's FOR ALL let a player DELETE their own participant row at any time,
-- including mid-tournament; schema.sql's "Players can leave tournament prior to
-- start" requires tournaments.status = 'registration'. Dropping the FOR ALL
-- restores that restriction. leaveTournament (tournament-actions.ts:62-75) has
-- no status guard of its own and does not .select(), so a post-registration
-- leave will now no-op silently rather than error. That is the original
-- intended posture; the silent no-op is pre-existing and left alone here.

-- ═══════════════════════════════════════════════════════════════
-- PART 2. matches — exempt organizers from the trigger, by allowlist
-- ═══════════════════════════════════════════════════════════════
-- CREATE OR REPLACE against the function 004 defined. 004's file is not edited:
-- it is already applied, and migrations are append-only history.
--
-- Allowlist rationale — an organizer may shape a bracket but never adjudicate
-- one. Blocked for organizers:
--   id, tournament_id, created_at   — identity/provenance; moving a match
--                                     between tournaments is not organizer work
--   winner_id, confirmed_by         — 004's central invariant. confirmMatch,
--                                     rejectMatch and resolveDispute all gate on
--                                     role === 'admin' (match-actions.ts:62,
--                                     212, 323), so no organizer path writes
--                                     these today. Keeping them blocked means
--                                     the trigger still holds the line if that
--                                     code gate is ever loosened.
--   player_a_id, player_b_id        — self-dealing guard. An organizer playing
--                                     in their own tournament could otherwise
--                                     rewrite a slot to place themselves in a
--                                     later round. No legitimate organizer path
--                                     UPDATEs these: generateBracket sets them
--                                     at INSERT (admin-actions.ts:196-197), and
--                                     advanceWinner's slot-fill
--                                     (match-actions.ts:521-522) is admin-only.
-- Everything else — round_name, round_order, next_match_id, scheduled_for,
-- score_a, score_b, proof_screenshot_url, status, reported_by — is permitted.
-- next_match_id is the column generateBracket actually needs.

CREATE OR REPLACE FUNCTION public.enforce_match_update_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  -- service_role and SQL Editor (auth.uid() IS NULL) remain unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

  -- Admin: unrestricted, as in 004. confirmMatch/rejectMatch/advanceWinner run
  -- under an admin session and legitimately rewrite winner_id, confirmed_by and
  -- the player slots of the *next* match in the bracket.
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Organizer: bracket structure only, and only in their own tournament.
  -- The creator check duplicates what 019's policy already asserts. That is
  -- deliberate, per 004's two-layer design — RLS filters which rows are
  -- visible to the write, the trigger constrains what the write may say.
  -- A NULL v_role (no profile row) falls through to the player branch below,
  -- which is the fail-closed direction.
  IF v_role = 'organizer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = OLD.tournament_id AND t.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Organizers may only modify matches in tournaments they created';
    END IF;

    IF NEW.id             IS DISTINCT FROM OLD.id
       OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
       OR NEW.created_at    IS DISTINCT FROM OLD.created_at
       OR NEW.winner_id     IS DISTINCT FROM OLD.winner_id
       OR NEW.confirmed_by  IS DISTINCT FROM OLD.confirmed_by
       OR NEW.player_a_id   IS DISTINCT FROM OLD.player_a_id
       OR NEW.player_b_id   IS DISTINCT FROM OLD.player_b_id
    THEN
      RAISE EXCEPTION 'Organizers may not modify match identity, player slots, or adjudication fields (winner_id, confirmed_by)';
    END IF;

    RETURN NEW;
  END IF;

  -- Player branch — unchanged from 004.
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

  -- A dispute is a pure status flip.
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

-- The trigger itself is unchanged and still bound to this function; no
-- DROP/CREATE TRIGGER needed. Restated only as an idempotency guard in case
-- 004 was never applied to this database.
DROP TRIGGER IF EXISTS trg_enforce_match_update_scope ON matches;
CREATE TRIGGER trg_enforce_match_update_scope
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_match_update_scope();

-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- Run separately after applying.

-- (a) tournament_participants must show NO policy with cmd 'ALL' or 'UPDATE'
--     other than 006's admin-only one. polcmd: r=SELECT a=INSERT w=UPDATE
--     d=DELETE *=ALL. Expect exactly one 'w' row, named "Admins can update
--     participants". If 006 was never applied, that row is ABSENT — apply
--     006 before this migration or elimination writes will silently no-op
--     again (Item 8's original symptom).
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
-- FROM pg_policy
-- WHERE polrelid = 'tournament_participants'::regclass
-- ORDER BY polcmd;

-- (b) Confirm no player can still un-eliminate. Expect 0 rows.
-- SELECT polname FROM pg_policy
-- WHERE polrelid = 'tournament_participants'::regclass
--   AND polcmd IN ('*', 'w')
--   AND pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%'
--   AND pg_get_expr(polqual, polrelid) NOT LIKE '%role%';

-- (c) Trigger still attached and enabled. Expect one row, tgenabled = 'O'.
-- SELECT tgname, tgenabled FROM pg_trigger
-- WHERE tgrelid = 'matches'::regclass
--   AND tgname = 'trg_enforce_match_update_scope';

-- (d) End-to-end: as an organizer who created a tournament, Generate Bracket
--     should now complete and populate next_match_id. Expect 0 rows for a
--     multi-round bracket (every non-final match linked).
-- SELECT id, round_name, next_match_id FROM matches
-- WHERE tournament_id = '<id>' AND next_match_id IS NULL
--   AND round_name <> 'Final';
