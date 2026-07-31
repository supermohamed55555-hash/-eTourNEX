-- eTourNEX Database Hardening Migration
-- Apply after schema.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS: admins can read, authenticated users can insert (for their own actions)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 2. MATCH CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════

-- Ensure scores are non-negative
ALTER TABLE matches ADD CONSTRAINT check_score_a_non_negative
  CHECK (score_a IS NULL OR score_a >= 0);

ALTER TABLE matches ADD CONSTRAINT check_score_b_non_negative
  CHECK (score_b IS NULL OR score_b >= 0);

-- Ensure player A and player B are different
ALTER TABLE matches ADD CONSTRAINT check_different_players
  CHECK (
    player_a_id IS NULL
    OR player_b_id IS NULL
    OR player_a_id != player_b_id
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. ADD 'disputed' STATUS SUPPORT
-- ═══════════════════════════════════════════════════════════════
-- The status column likely uses a CHECK constraint or enum.
-- We need to add 'disputed' as a valid status.
-- First drop the old constraint if it exists, then add the new one.

DO $$
BEGIN
  -- Try to drop existing check constraint on status
  BEGIN
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
  EXCEPTION WHEN undefined_object THEN
    NULL; -- constraint doesn't exist, that's fine
  END;

  -- Add new constraint with 'disputed' included
  ALTER TABLE matches ADD CONSTRAINT matches_status_check
    CHECK (status IN ('scheduled', 'pending_review', 'confirmed', 'disputed', 'cancelled'));
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. TOURNAMENT REGISTRATION GUARD
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_tournament_registration()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = NEW.tournament_id
    AND status = 'registration'
  ) THEN
    RAISE EXCEPTION 'Tournament is not accepting registrations';
  END IF;

  -- Check max players
  IF EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = NEW.tournament_id
    AND t.max_players IS NOT NULL
    AND (
      SELECT COUNT(*) FROM tournament_participants tp
      WHERE tp.tournament_id = NEW.tournament_id
    ) >= t.max_players
  ) THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_tournament_registration ON tournament_participants;

CREATE TRIGGER enforce_tournament_registration
  BEFORE INSERT ON tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_tournament_registration();

-- ═══════════════════════════════════════════════════════════════
-- 5. USERNAME-TO-EMAIL LOOKUP RPC
-- ═══════════════════════════════════════════════════════════════
-- Used by the login page for username-based auth.
-- Returns the email for a given username, or NULL if not found.

CREATE OR REPLACE FUNCTION get_user_email_by_username(lookup_username TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT u.email INTO user_email
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(lookup_username);

  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict access to this function
REVOKE EXECUTE ON FUNCTION get_user_email_by_username FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_email_by_username TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 6. ADDITIONAL INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Speed up participant lookups
CREATE INDEX IF NOT EXISTS idx_tournament_participants_player_id
  ON tournament_participants(player_id);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id
  ON tournament_participants(tournament_id);

-- Speed up match queries
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id
  ON matches(tournament_id);

CREATE INDEX IF NOT EXISTS idx_matches_status
  ON matches(status);

-- Speed up leaderboard lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_player_id
  ON leaderboard_entries(player_id);

-- Speed up profile username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON profiles(LOWER(username));
