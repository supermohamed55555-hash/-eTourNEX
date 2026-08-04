-- ========================================================
-- eTourNEX Platform — Phase 4: Fix Team Members RLS Policy
-- Migration 020 — Idempotent
-- ========================================================

-- 1. FIX INSERT POLICY FOR team_members
-- Allow insertion if user is the team's captain (from teams table), or existing captain/officer in team_members, or admin
DROP POLICY IF EXISTS "Captain and officer can insert members" ON public.team_members;
CREATE POLICY "Captain and officer can insert members" ON public.team_members
  FOR INSERT WITH CHECK (
    -- User is captain according to teams table (crucial for initial team creation)
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    -- User is existing captain or officer in team_members table
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. FIX UPDATE POLICY FOR team_members
DROP POLICY IF EXISTS "Captain and officer can update members" ON public.team_members;
CREATE POLICY "Captain and officer can update members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. FIX DELETE POLICY FOR team_members
DROP POLICY IF EXISTS "Captain officer or self can delete member" ON public.team_members;
CREATE POLICY "Captain officer or self can delete member" ON public.team_members
  FOR DELETE USING (
    player_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.captain_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
