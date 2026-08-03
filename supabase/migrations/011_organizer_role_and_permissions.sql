-- ========================================================
-- eTourNEX Platform - Phase 3 Section 5: Organizer System
-- Migration 011 — Idempotent
-- ========================================================

-- 1. PROFILE ROLE CHECK CONSTRAINT (Include 'organizer')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_role_check'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'profiles_role_check'
        AND pg_get_constraintdef(oid) LIKE '%organizer%'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('player', 'admin', 'organizer'));
    END IF;
  ELSE
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('player', 'admin', 'organizer'));
  END IF;
END $$;

-- 2. TOURNAMENTS POLICIES (Allow Creator or Admin to Manage)
-- Allow authenticated users with 'organizer' or 'admin' role to insert tournaments
DROP POLICY IF EXISTS "Organizers can create tournaments" ON public.tournaments;
CREATE POLICY "Organizers can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

-- Allow creator or admin to update their tournaments
DROP POLICY IF EXISTS "Creators or admins can update tournaments" ON public.tournaments;
CREATE POLICY "Creators or admins can update tournaments" ON public.tournaments
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. MATCHES POLICIES FOR ORGANIZERS
DROP POLICY IF EXISTS "Organizers can update tournament matches" ON public.matches;
CREATE POLICY "Organizers can update tournament matches" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = matches.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );
