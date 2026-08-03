-- eTourNEX — Phase 2 interaction layer: points, achievements, notifications
-- Apply after 006_participant_elimination.sql
--
-- Adds four concerns that all hang off events the platform already produces:
--   • points        — a ledger of awards, plus a denormalised total on the leaderboard
--   • achievements  — a catalogue + per-player unlock rows
--   • badges        — NO new tables; derived from data that already exists
--                     (profiles.email_confirmed → Verified,
--                      leaderboard_entries.tournaments_won → Champion)
--   • notifications — per-user rows with a read/unread state
--
-- ═══ WHY THIS IS ALL TRIGGERS AND NOT APPLICATION CODE ═══
--
-- The obvious implementation is to add supabase.from(...).insert(...) calls to
-- confirmMatch/advanceWinner/joinTournament/generateBracket. That was rejected.
--
-- SECURITY_BACKLOG.md Item 13 is open: confirmMatch already performs three
-- independent, non-atomic writes (match → bracket → audit), and a mid-sequence
-- failure leaves partial state. Its closing line is explicit — "Do not fix
-- piecemeal with more single writes — the three writes must move together."
-- Bolting five more writes (points, leaderboard, two achievements, a
-- notification) onto that sequence would multiply the number of distinct
-- partial states an admin can land in, from three to eight.
--
-- A trigger runs inside the same transaction as the statement that fired it.
-- The points award, the leaderboard update and the achievement unlock either
-- all commit with the match confirmation or none of them do. That is the
-- atomicity Item 13 asks for, applied to the new code rather than deferred
-- alongside the old. It also satisfies "achievements unlock automatically"
-- literally: nothing in the app layer has to remember to call anything, so a
-- future code path that confirms a match by any other route still awards.
--
-- Consequence to be aware of: the trigger functions are SECURITY DEFINER and
-- therefore bypass RLS. Each one is entered only from a trigger on a table
-- whose own RLS already gated the write, and none of them read caller-supplied
-- text — they read OLD/NEW columns that Postgres populated. search_path is
-- pinned on every one (same reasoning as 003).
--
-- ═══ IDEMPOTENCY ═══
--
-- Every award path is guarded by a unique index and ON CONFLICT DO NOTHING, so
-- re-confirming a match, re-running the backfill, or regenerating a bracket
-- cannot double-award. This is load-bearing, not defensive: rejectMatch can
-- return a confirmed match to 'scheduled', after which it can be confirmed
-- again, and the trigger will fire a second time for the same match.

-- ═══════════════════════════════════════════════════════════════
-- 1. POINT RULES (values live in the database, not in TypeScript)
-- ═══════════════════════════════════════════════════════════════
-- A table rather than constants in the trigger body so the award values can be
-- tuned in one place, are readable by the UI as real data, and show up in a
-- schema dump. The three rows are exactly the three earning events specified
-- for Phase 2 — there is no shop and no spending side.

CREATE TABLE IF NOT EXISTS point_rules (
  event_type  TEXT PRIMARY KEY
    CHECK (event_type IN ('match_win', 'tournament_participation', 'tournament_champion')),
  points      INT NOT NULL CHECK (points > 0),
  label       TEXT NOT NULL,
  description TEXT NOT NULL
);

INSERT INTO point_rules (event_type, points, label, description) VALUES
  ('match_win',                 50,  'Match Win',                'Awarded once for every match you win, after an admin confirms the result.'),
  ('tournament_participation',  10,  'Tournament Entry',         'Awarded once when you register for a tournament.'),
  ('tournament_champion',       200, 'Tournament Champion',      'Awarded once for winning the final match of a tournament.')
ON CONFLICT (event_type) DO UPDATE
  SET points = EXCLUDED.points,
      label = EXCLUDED.label,
      description = EXCLUDED.description;

-- ═══════════════════════════════════════════════════════════════
-- 2. POINT EVENTS LEDGER
-- ═══════════════════════════════════════════════════════════════
-- Append-only in practice: one row per award, carrying the reason and the
-- entity it came from. A ledger rather than a bare counter so "why do I have
-- 310 points" is answerable from the data, and so a mis-award can be undone by
-- deleting one row (the total re-derives itself, see section 4).
--
-- points is denormalised onto leaderboard_entries because the leaderboard sorts
-- by it on every page load and an aggregate over the ledger would need either a
-- view or a per-row subquery. The denormalisation is maintained by trigger, not
-- by application code, so it cannot drift.

CREATE TABLE IF NOT EXISTS point_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL REFERENCES point_rules(event_type),
  points        INT  NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_events_player ON point_events(player_id, created_at DESC);

-- Two partial indexes rather than one composite UNIQUE: Postgres treats NULLs
-- as distinct in a unique constraint, so UNIQUE(player_id, event_type,
-- match_id, tournament_id) would happily accept an unlimited number of
-- (player, 'match_win', NULL, NULL) rows. Partial indexes scoped to the column
-- that is actually populated for each event type do enforce it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_match
  ON point_events(player_id, event_type, match_id)
  WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_events_tournament
  ON point_events(player_id, event_type, tournament_id)
  WHERE match_id IS NULL AND tournament_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. LEADERBOARD: POINTS COLUMN
-- ═══════════════════════════════════════════════════════════════
-- Additive only. The existing wins/losses/tournaments_played/tournaments_won
-- columns keep their meaning and their existing consumers (leaderboard page,
-- player profile, dashboard) are untouched.

ALTER TABLE leaderboard_entries
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_entries(points DESC);

-- ═══════════════════════════════════════════════════════════════
-- 4. LEDGER → LEADERBOARD TOTAL
-- ═══════════════════════════════════════════════════════════════
-- Fires on INSERT and DELETE of a ledger row, so the total is a function of the
-- ledger and can never disagree with it. Handles the case of a player with no
-- leaderboard row (only possible for accounts created before handle_new_user
-- existed, or seeded directly in SQL) by creating one.

CREATE OR REPLACE FUNCTION public.sync_leaderboard_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO leaderboard_entries (player_id, points)
    VALUES (NEW.player_id, NEW.points)
    ON CONFLICT (player_id) DO UPDATE
      SET points = leaderboard_entries.points + NEW.points,
          updated_at = now();
    RETURN NEW;
  ELSE
    UPDATE leaderboard_entries
    SET points = GREATEST(0, points - OLD.points),
        updated_at = now()
    WHERE player_id = OLD.player_id;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leaderboard_points ON point_events;

CREATE TRIGGER trg_sync_leaderboard_points
  AFTER INSERT OR DELETE ON point_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_leaderboard_points();

-- ═══════════════════════════════════════════════════════════════
-- 5. ACHIEVEMENTS
-- ═══════════════════════════════════════════════════════════════
-- Catalogue + unlock rows. `code` is the stable key the triggers reference;
-- `id` is never hardcoded anywhere so the catalogue can be reseeded freely.
--
-- Exactly the three achievements Phase 2 specifies. Deliberately no more: every
-- row here must be unlockable from data the platform actually records, and
-- src/app/_hidden/dashboard-achievements/page.tsx was hidden in Phase 1
-- precisely because it listed six achievements with hardcoded unlock states.
-- Adding "On Fire" or "Ironclad" would mean inventing streak/flawless-run
-- tracking that no table holds.

CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,          -- lucide-react icon name, resolved client-side
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO achievements (code, name, description, icon, sort_order) VALUES
  ('first_match', 'First Blood',        'Play your first confirmed tournament match.', 'Swords', 1),
  ('first_win',   'First Victory',      'Win your first confirmed tournament match.',  'Flame',  2),
  ('champion',    'Tournament Champion','Win the final match of a tournament.',        'Trophy', 3)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS player_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);

-- Unlock helper. Takes the code, not the id, so callers never embed a UUID.
-- ON CONFLICT DO NOTHING makes it safe to call on every match confirmation
-- rather than only the first — the trigger does not have to know whether the
-- player already has it.
CREATE OR REPLACE FUNCTION public.grant_achievement(p_player_id UUID, p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO player_achievements (player_id, achievement_id)
  SELECT p_player_id, a.id FROM achievements a WHERE a.code = p_code
  ON CONFLICT (player_id, achievement_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_achievement(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_achievement(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_achievement(UUID, TEXT) FROM authenticated;

-- Points helper, same shape and same reasoning. Reads the award value from
-- point_rules so no number is duplicated into a trigger body.
CREATE OR REPLACE FUNCTION public.award_points(
  p_player_id     UUID,
  p_event_type    TEXT,
  p_tournament_id UUID DEFAULT NULL,
  p_match_id      UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
BEGIN
  IF p_player_id IS NULL THEN RETURN; END IF;

  SELECT points INTO v_points FROM point_rules WHERE event_type = p_event_type;
  IF v_points IS NULL THEN
    RAISE EXCEPTION 'award_points: no rule for event_type %', p_event_type;
  END IF;

  INSERT INTO point_events (player_id, event_type, points, tournament_id, match_id)
  VALUES (p_player_id, p_event_type, v_points, p_tournament_id, p_match_id)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_points(UUID, TEXT, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_points(UUID, TEXT, UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_points(UUID, TEXT, UUID, UUID) FROM authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 6. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
-- user_id references profiles rather than auth.users so the RLS predicate and
-- every join in the app stay in the public schema, matching the rest of the
-- tables here.
--
-- tournament_id / match_id are FK ON DELETE CASCADE on purpose: regenerating a
-- bracket deletes and reinserts every match (admin-actions.ts:97), and a match
-- reminder pointing at a match that no longer exists is worse than no reminder.
-- The cascade cleans them up without any application code.

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('match_reminder', 'tournament_started')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  link          TEXT,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- Same NULL-distinctness problem as the ledger; same fix.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_match
  ON notifications(user_id, type, match_id)
  WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_tournament
  ON notifications(user_id, type, tournament_id)
  WHERE match_id IS NULL AND tournament_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 7. TRIGGER — TOURNAMENT REGISTRATION
-- ═══════════════════════════════════════════════════════════════
-- joinTournament inserts one tournament_participants row; leaveTournament
-- deletes it. Both are mirrored here so a player who registers and withdraws
-- during the registration window nets zero points and zero tournaments_played,
-- rather than farming 10 points per join/leave cycle.
--
-- Deleting the ledger row is what reverses the points — section 4's trigger
-- picks that up. Nothing here touches leaderboard_entries.points directly.

CREATE OR REPLACE FUNCTION public.handle_participant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_points(NEW.player_id, 'tournament_participation', NEW.tournament_id, NULL);

    INSERT INTO leaderboard_entries (player_id, tournaments_played)
    VALUES (NEW.player_id, 1)
    ON CONFLICT (player_id) DO UPDATE
      SET tournaments_played = leaderboard_entries.tournaments_played + 1,
          updated_at = now();

    RETURN NEW;
  ELSE
    DELETE FROM point_events
    WHERE player_id = OLD.player_id
      AND event_type = 'tournament_participation'
      AND tournament_id = OLD.tournament_id;

    UPDATE leaderboard_entries
    SET tournaments_played = GREATEST(0, tournaments_played - 1),
        updated_at = now()
    WHERE player_id = OLD.player_id;

    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_participant_change ON tournament_participants;

CREATE TRIGGER trg_handle_participant_change
  AFTER INSERT OR DELETE ON tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_participant_change();

-- ═══════════════════════════════════════════════════════════════
-- 8. TRIGGER — MATCH CONFIRMED
-- ═══════════════════════════════════════════════════════════════
-- The single place where match outcomes turn into points, leaderboard rows and
-- achievements.
--
-- Handles the confirmation transition in BOTH directions. rejectMatch
-- (match-actions.ts:110) returns a confirmed match to 'scheduled', after which
-- it can be reported and confirmed again. An award-only trigger would count
-- that win twice per confirm/reject/confirm cycle: award_points is idempotent
-- (ON CONFLICT on the ledger), but a bare `wins = wins + 1` is not. The
-- reversal branch is what keeps the two consistent, and it mirrors the
-- join/leave symmetry in section 7.
--
-- OLD and NEW are both always populated here — the trigger is AFTER UPDATE
-- only, never INSERT.
--
-- "Champion" is derived from next_match_id IS NULL — the same test
-- advanceWinner (match-actions.ts:280) uses to decide a tournament is over.
-- Keeping the two in agreement matters: if the bracket says this was the final,
-- the trophy and the tournaments_won counter must agree with it.
--
-- Note this trigger reads tournament_participants to map a participant id to a
-- profile id. matches stores participant ids, leaderboard_entries stores
-- profile ids, and conflating them was worth calling out explicitly.

CREATE OR REPLACE FUNCTION public.handle_match_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row            matches;   -- whichever of OLD/NEW carries the adjudication
  v_delta          INT;       -- +1 awarding, -1 reversing
  v_winner_profile UUID;
  v_loser_profile  UUID;
  v_loser_part     UUID;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    -- Awarding. Read NEW: winner_id was just set.
    v_row := NEW; v_delta := 1;
  ELSIF OLD.status = 'confirmed' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    -- Reversing. Read OLD: rejectMatch nulls winner_id in the same statement,
    -- so NEW no longer knows who won.
    v_row := OLD; v_delta := -1;
  ELSE
    -- Any other UPDATE on a match is not a confirmation transition.
    RETURN NEW;
  END IF;

  IF v_row.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT player_id INTO v_winner_profile
  FROM tournament_participants WHERE id = v_row.winner_id;

  v_loser_part := CASE WHEN v_row.player_a_id = v_row.winner_id
                       THEN v_row.player_b_id ELSE v_row.player_a_id END;

  IF v_loser_part IS NOT NULL THEN
    SELECT player_id INTO v_loser_profile
    FROM tournament_participants WHERE id = v_loser_part;
  END IF;

  -- ── Winner ──
  IF v_winner_profile IS NOT NULL THEN
    IF v_delta = 1 THEN
      PERFORM award_points(v_winner_profile, 'match_win', v_row.tournament_id, v_row.id);
    ELSE
      DELETE FROM point_events
      WHERE player_id = v_winner_profile
        AND event_type = 'match_win'
        AND match_id = v_row.id;
    END IF;

    -- GREATEST on the insert value: a reversal implies the row already exists,
    -- but a -1 insert would otherwise seed a negative count if it somehow did not.
    INSERT INTO leaderboard_entries (player_id, wins)
    VALUES (v_winner_profile, GREATEST(0, v_delta))
    ON CONFLICT (player_id) DO UPDATE
      SET wins = GREATEST(0, leaderboard_entries.wins + v_delta), updated_at = now();

    -- Achievements are granted, never revoked. An unlock is a historical fact
    -- ("you did win a match on this date"), and revoking would require proving
    -- no OTHER confirmed match still justifies it. A stale unlock after an
    -- admin mis-confirm is cosmetic; a wrong leaderboard is not, which is why
    -- the counters above reverse and these do not.
    IF v_delta = 1 THEN
      PERFORM grant_achievement(v_winner_profile, 'first_match');
      PERFORM grant_achievement(v_winner_profile, 'first_win');
    END IF;
  END IF;

  -- ── Loser ──
  -- A bye has no opponent, hence the NULL guard. Losing still counts as having
  -- played, so first_match is granted here too.
  IF v_loser_profile IS NOT NULL THEN
    INSERT INTO leaderboard_entries (player_id, losses)
    VALUES (v_loser_profile, GREATEST(0, v_delta))
    ON CONFLICT (player_id) DO UPDATE
      SET losses = GREATEST(0, leaderboard_entries.losses + v_delta), updated_at = now();

    IF v_delta = 1 THEN
      PERFORM grant_achievement(v_loser_profile, 'first_match');
    END IF;
  END IF;

  -- ── Final match → champion ──
  IF v_row.next_match_id IS NULL AND v_winner_profile IS NOT NULL THEN
    IF v_delta = 1 THEN
      PERFORM award_points(v_winner_profile, 'tournament_champion', v_row.tournament_id, NULL);
    ELSE
      DELETE FROM point_events
      WHERE player_id = v_winner_profile
        AND event_type = 'tournament_champion'
        AND tournament_id = v_row.tournament_id;
    END IF;

    INSERT INTO leaderboard_entries (player_id, tournaments_won)
    VALUES (v_winner_profile, GREATEST(0, v_delta))
    ON CONFLICT (player_id) DO UPDATE
      SET tournaments_won = GREATEST(0, leaderboard_entries.tournaments_won + v_delta),
          updated_at = now();

    IF v_delta = 1 THEN
      PERFORM grant_achievement(v_winner_profile, 'champion');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_match_confirmed ON matches;

CREATE TRIGGER trg_handle_match_confirmed
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_match_confirmed();

-- ═══════════════════════════════════════════════════════════════
-- 9. TRIGGER — MATCH REMINDER NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
-- Fires when a player lands in a scheduled match: on INSERT for round 1 (the
-- bracket generator writes both slots up front) and on UPDATE for every later
-- round (advanceWinner fills one slot at a time as winners come through).
--
-- Duplicate suppression is left entirely to uq_notifications_match +
-- ON CONFLICT DO NOTHING. The UPDATE branch necessarily re-examines the slot
-- that was already filled — advanceWinner writes one slot while the other
-- holds an earlier winner — and the index absorbs that. An explicit OLD-vs-NEW
-- comparison was tried and removed: it duplicated what the index already
-- guarantees, and PL/pgSQL does not promise short-circuit evaluation of AND,
-- so a `TG_OP = 'UPDATE' AND OLD.x = ...` guard is not reliably safe to
-- evaluate on the INSERT path where OLD does not exist.

CREATE OR REPLACE FUNCTION public.notify_match_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_name TEXT;
  v_round           TEXT;
  v_slot            UUID;
  v_profile         UUID;
BEGIN
  IF NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_tournament_name FROM tournaments WHERE id = NEW.tournament_id;
  v_round := COALESCE(NEW.round_name, 'Round ' || NEW.round_order);

  FOREACH v_slot IN ARRAY ARRAY[NEW.player_a_id, NEW.player_b_id] LOOP
    CONTINUE WHEN v_slot IS NULL;

    SELECT player_id INTO v_profile FROM tournament_participants WHERE id = v_slot;
    CONTINUE WHEN v_profile IS NULL;

    INSERT INTO notifications (user_id, type, title, body, link, tournament_id, match_id)
    VALUES (
      v_profile,
      'match_reminder',
      v_round || ' match scheduled',
      'You have an upcoming ' || v_round || ' match in ' ||
        COALESCE(v_tournament_name, 'a tournament') ||
        CASE WHEN NEW.scheduled_for IS NOT NULL
             THEN ' on ' || to_char(NEW.scheduled_for AT TIME ZONE 'UTC', 'Mon DD, HH24:MI') || ' UTC'
             ELSE '' END ||
        '. Report your result with a screenshot once it is played.',
      '/dashboard/matches',
      NEW.tournament_id,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_match_scheduled ON matches;

CREATE TRIGGER trg_notify_match_scheduled
  AFTER INSERT OR UPDATE OF player_a_id, player_b_id ON matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_scheduled();

-- ═══════════════════════════════════════════════════════════════
-- 10. TRIGGER — TOURNAMENT STARTED NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
-- generateBracket inserts the matches first (admin-actions.ts:202) and flips
-- the tournament to in_progress last (admin-actions.ts:237). By the time this
-- fires the bracket exists, so a player who follows the link sees a real
-- bracket rather than an empty one.

CREATE OR REPLACE FUNCTION public.notify_tournament_started()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'in_progress' OR OLD.status = 'in_progress' THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, link, tournament_id)
  SELECT
    tp.player_id,
    'tournament_started',
    NEW.name || ' has started',
    'The bracket for ' || NEW.name || ' is live. Check your matches and report results as you play them.',
    '/tournaments/' || NEW.id::text,
    NEW.id
  FROM tournament_participants tp
  WHERE tp.tournament_id = NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_tournament_started ON tournaments;

CREATE TRIGGER trg_notify_tournament_started
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tournament_started();

-- ═══════════════════════════════════════════════════════════════
-- 11. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE point_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- ── Public read, admin write ──
-- Points and achievements are public information: they are displayed on the
-- leaderboard and on every player's public profile, so a per-user read policy
-- would break those pages for logged-out visitors. This matches the existing
-- `using (true)` SELECT on leaderboard_entries (schema.sql:158).
--
-- No INSERT/UPDATE/DELETE policy for players anywhere in this section. Awards
-- come from triggers, which run SECURITY DEFINER and bypass RLS. A player with
-- a REST client therefore cannot mint themselves points — the absence of a
-- policy is the enforcement, and it must stay absent.

DROP POLICY IF EXISTS "Point rules readable by everyone" ON point_rules;
CREATE POLICY "Point rules readable by everyone" ON point_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage point rules" ON point_rules;
CREATE POLICY "Admins can manage point rules" ON point_rules FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Point events readable by everyone" ON point_events;
CREATE POLICY "Point events readable by everyone" ON point_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage point events" ON point_events;
CREATE POLICY "Admins can manage point events" ON point_events FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Achievements readable by everyone" ON achievements;
CREATE POLICY "Achievements readable by everyone" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage achievements" ON achievements;
CREATE POLICY "Admins can manage achievements" ON achievements FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Player achievements readable by everyone" ON player_achievements;
CREATE POLICY "Player achievements readable by everyone" ON player_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage player achievements" ON player_achievements;
CREATE POLICY "Admins can manage player achievements" ON player_achievements FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Notifications: private, owner-only ──
-- No admin policy on purpose. Admins can already read audit_logs, which records
-- the actions notifications are generated from; giving them a window into every
-- player's inbox as well is scope an admin panel feature would have to ask for
-- explicitly. Least privilege wins by default.
--
-- UPDATE exists solely so a user can mark their own notification read. The
-- WITH CHECK pins user_id so a row cannot be reassigned to someone else; the
-- trigger in section 12 pins everything else, because RLS WITH CHECK cannot see
-- the OLD row (the same limitation 004 documents for matches).

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;
CREATE POLICY "Users can mark own notifications read" ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 12. NOTIFICATION UPDATE SCOPE TRIGGER
-- ═══════════════════════════════════════════════════════════════
-- Without this, "mark as read" is a PATCH on a row the user owns, and the
-- policy above would let them rewrite title and body too — turning their own
-- inbox into an editable surface, and any future admin/moderation view of it
-- into a liar. read_at is the only column a client has business changing.

CREATE OR REPLACE FUNCTION public.enforce_notification_update_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- service_role and the SQL Editor (auth.uid() IS NULL) are unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.user_id       IS DISTINCT FROM OLD.user_id
     OR NEW.type          IS DISTINCT FROM OLD.type
     OR NEW.title         IS DISTINCT FROM OLD.title
     OR NEW.body          IS DISTINCT FROM OLD.body
     OR NEW.link          IS DISTINCT FROM OLD.link
     OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
     OR NEW.match_id      IS DISTINCT FROM OLD.match_id
     OR NEW.created_at    IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only read_at may be modified on a notification';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_notification_update_scope ON notifications;

CREATE TRIGGER trg_enforce_notification_update_scope
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_notification_update_scope();

-- ═══════════════════════════════════════════════════════════════
-- 13. BACKFILL
-- ═══════════════════════════════════════════════════════════════
-- The triggers above only fire on future events. Everything below derives the
-- current state from the tournaments and matches that already exist, so the
-- feature does not launch showing every player zero.
--
-- This is not optional cosmetics: leaderboard_entries has never been written by
-- anything. handle_new_user (schema.sql:206) creates the row at zero and no
-- code path has ever updated it — grep for 'leaderboard_entries' in src/ finds
-- only two SELECTs in bracket/engine.ts. So wins/losses/tournaments_played/
-- tournaments_won have read as 0 on every page since launch. The recompute
-- below is therefore a repair, not a migration of existing values; there are no
-- existing values to preserve.
--
-- Runs in the SQL Editor as the service role, which bypasses RLS. Every step is
-- idempotent and safe to re-run.

-- (a) Participation ledger — one row per existing registration.
INSERT INTO point_events (player_id, event_type, points, tournament_id)
SELECT tp.player_id,
       'tournament_participation',
       (SELECT points FROM point_rules WHERE event_type = 'tournament_participation'),
       tp.tournament_id
FROM tournament_participants tp
ON CONFLICT DO NOTHING;

-- (b) Match-win ledger — one row per confirmed match with an adjudicated winner.
INSERT INTO point_events (player_id, event_type, points, tournament_id, match_id)
SELECT tp.player_id,
       'match_win',
       (SELECT points FROM point_rules WHERE event_type = 'match_win'),
       m.tournament_id,
       m.id
FROM matches m
JOIN tournament_participants tp ON tp.id = m.winner_id
WHERE m.status = 'confirmed' AND m.winner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- (c) Champion ledger — winner of a confirmed final (next_match_id IS NULL).
INSERT INTO point_events (player_id, event_type, points, tournament_id)
SELECT tp.player_id,
       'tournament_champion',
       (SELECT points FROM point_rules WHERE event_type = 'tournament_champion'),
       m.tournament_id
FROM matches m
JOIN tournament_participants tp ON tp.id = m.winner_id
WHERE m.status = 'confirmed' AND m.winner_id IS NOT NULL AND m.next_match_id IS NULL
ON CONFLICT DO NOTHING;

-- (d) Leaderboard recompute. points is set from the ledger rather than
--     incremented, because the trigger in section 4 already incremented it as
--     (a)-(c) inserted — adding again would double it. The other four columns
--     are computed from scratch for the reason in the section header.
UPDATE leaderboard_entries le
SET points = COALESCE((
      SELECT SUM(pe.points) FROM point_events pe WHERE pe.player_id = le.player_id
    ), 0),
    wins = COALESCE((
      SELECT COUNT(*) FROM matches m
      JOIN tournament_participants tp ON tp.id = m.winner_id
      WHERE m.status = 'confirmed' AND tp.player_id = le.player_id
    ), 0),
    losses = COALESCE((
      SELECT COUNT(*) FROM matches m
      JOIN tournament_participants tp
        ON tp.id = CASE WHEN m.player_a_id = m.winner_id THEN m.player_b_id ELSE m.player_a_id END
      WHERE m.status = 'confirmed' AND m.winner_id IS NOT NULL AND tp.player_id = le.player_id
    ), 0),
    tournaments_played = COALESCE((
      SELECT COUNT(*) FROM tournament_participants tp WHERE tp.player_id = le.player_id
    ), 0),
    tournaments_won = COALESCE((
      SELECT COUNT(*) FROM matches m
      JOIN tournament_participants tp ON tp.id = m.winner_id
      WHERE m.status = 'confirmed' AND m.next_match_id IS NULL AND tp.player_id = le.player_id
    ), 0),
    updated_at = now();

-- (e) Achievement unlocks, derived from the same match data.
INSERT INTO player_achievements (player_id, achievement_id)
SELECT DISTINCT tp.player_id, a.id
FROM matches m
JOIN tournament_participants tp ON tp.id IN (m.player_a_id, m.player_b_id)
CROSS JOIN achievements a
WHERE m.status = 'confirmed' AND a.code = 'first_match'
ON CONFLICT DO NOTHING;

INSERT INTO player_achievements (player_id, achievement_id)
SELECT DISTINCT tp.player_id, a.id
FROM matches m
JOIN tournament_participants tp ON tp.id = m.winner_id
CROSS JOIN achievements a
WHERE m.status = 'confirmed' AND a.code = 'first_win'
ON CONFLICT DO NOTHING;

INSERT INTO player_achievements (player_id, achievement_id)
SELECT DISTINCT tp.player_id, a.id
FROM matches m
JOIN tournament_participants tp ON tp.id = m.winner_id
CROSS JOIN achievements a
WHERE m.status = 'confirmed' AND m.next_match_id IS NULL AND a.code = 'champion'
ON CONFLICT DO NOTHING;

-- (f) Notifications are deliberately NOT backfilled. A notification is a
--     time-sensitive nudge; generating "your match is scheduled" for brackets
--     that finished weeks ago would fill every inbox with unread items about
--     matches that are already played. New notifications start from the next
--     bracket generation.

-- ═══════════════════════════════════════════════════════════════
-- 14. VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- Run separately after applying.

-- (a) Ledger totals agree with the denormalised column. Expect ZERO rows —
--     any row here means section 4's trigger and the backfill disagree.
-- SELECT p.username, le.points AS denormalised, COALESCE(SUM(pe.points), 0) AS ledger
-- FROM leaderboard_entries le
-- JOIN profiles p ON p.id = le.player_id
-- LEFT JOIN point_events pe ON pe.player_id = le.player_id
-- GROUP BY p.username, le.points
-- HAVING le.points <> COALESCE(SUM(pe.points), 0);

-- (b) Leaderboard now reflects real match history rather than zeros.
-- SELECT p.username, le.points, le.wins, le.losses, le.tournaments_played, le.tournaments_won
-- FROM leaderboard_entries le
-- JOIN profiles p ON p.id = le.player_id
-- ORDER BY le.points DESC;

-- (c) Achievements landed. Expect first_match for everyone who played a
--     confirmed match, first_win for winners, champion for finalists.
-- SELECT p.username, a.code, pa.unlocked_at
-- FROM player_achievements pa
-- JOIN profiles p ON p.id = pa.player_id
-- JOIN achievements a ON a.id = pa.achievement_id
-- ORDER BY p.username, a.sort_order;

-- (d) No player-writable policy exists on the award tables. Expect only the
--     SELECT policies and the admin ALL policies — if a player-scoped INSERT
--     or UPDATE ever appears here, points become self-mintable.
-- SELECT c.relname, pol.polname, pol.polcmd
-- FROM pg_policy pol
-- JOIN pg_class c ON c.oid = pol.polrelid
-- WHERE c.relname IN ('point_events', 'point_rules', 'achievements', 'player_achievements')
-- ORDER BY c.relname, pol.polcmd;

-- (e) All six triggers attached and enabled (tgenabled = 'O').
-- SELECT c.relname AS table_name, t.tgname, t.tgenabled
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- WHERE t.tgname IN (
--   'trg_sync_leaderboard_points', 'trg_handle_participant_change',
--   'trg_handle_match_confirmed', 'trg_notify_match_scheduled',
--   'trg_notify_tournament_started', 'trg_enforce_notification_update_scope'
-- )
-- ORDER BY c.relname, t.tgname;

-- (f) Notification privacy. Expect exactly two policies, both owner-scoped,
--     and no INSERT or DELETE policy of any kind.
-- SELECT polname, polcmd, qual, with_check
-- FROM pg_policy WHERE polrelid = 'notifications'::regclass;
