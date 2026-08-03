-- ========================================================
-- eTourNEX Platform — Phase 4 Section 5: Organizer System
-- Migration 019 — Idempotent
-- ========================================================

-- 1. ORGANIZER & CREATOR PARTICIPANTS MANAGEMENT
DROP POLICY IF EXISTS "Organizers or creators can manage participants" ON public.tournament_participants;
CREATE POLICY "Organizers or creators can manage participants" ON public.tournament_participants
  FOR ALL USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_participants.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- 2. ORGANIZER MATCH MANAGEMENT
DROP POLICY IF EXISTS "Organizers can manage tournament matches" ON public.matches;
CREATE POLICY "Organizers can manage tournament matches" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = matches.tournament_id
        AND (created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    )
  );

-- 3. ORGANIZER TOURNAMENT DELETION (ONLY CREATOR OR ADMIN)
DROP POLICY IF EXISTS "Creators or admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Creators or admins can delete tournaments" ON public.tournaments
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
