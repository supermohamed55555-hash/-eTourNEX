-- ========================================================
-- eTourNEX Platform - Phase 3 Section 2: Match Disputes
-- Migration 009 — Idempotent
-- ========================================================

-- 1. ADD 'disputed' STATUS TO matches check constraint
-- We must drop and recreate the check constraint if 'disputed' is not already included

DO $$
BEGIN
  -- Add 'disputed' to the matches.status check constraint if not already present
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'matches'
      AND constraint_name = 'matches_status_check'
  ) THEN
    -- Check if constraint already includes 'disputed'
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'matches_status_check'
        AND pg_get_constraintdef(oid) LIKE '%disputed%'
    ) THEN
      ALTER TABLE public.matches DROP CONSTRAINT matches_status_check;
      ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
        CHECK (status IN ('scheduled','pending_review','confirmed','disputed','cancelled'));
    END IF;
  ELSE
    -- Constraint doesn't exist, add it
    ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
      CHECK (status IN ('scheduled','pending_review','confirmed','disputed','cancelled'));
  END IF;
END $$;

-- 2. MATCH DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.match_disputes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  reported_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'resolved', 'dismissed')),
  admin_notes    TEXT,
  resolved_by    UUID REFERENCES public.profiles(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate open disputes for the same match
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_disputes_open_unique
  ON public.match_disputes (match_id)
  WHERE status = 'open';

-- Index for fast lookup by match
CREATE INDEX IF NOT EXISTS idx_match_disputes_match_id
  ON public.match_disputes (match_id);

-- Index for listing disputes by status
CREATE INDEX IF NOT EXISTS idx_match_disputes_status
  ON public.match_disputes (status);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.match_disputes ENABLE ROW LEVEL SECURITY;

-- Anyone can read disputes (needed for admin UI)
DROP POLICY IF EXISTS "Disputes readable by admins" ON public.match_disputes;
CREATE POLICY "Disputes readable by admins" ON public.match_disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = reported_by
  );

-- Authenticated players can open a dispute
DROP POLICY IF EXISTS "Players can create disputes" ON public.match_disputes;
CREATE POLICY "Players can create disputes" ON public.match_disputes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reported_by);

-- Only admins can update (resolve/dismiss) disputes
DROP POLICY IF EXISTS "Admins can update disputes" ON public.match_disputes;
CREATE POLICY "Admins can update disputes" ON public.match_disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
