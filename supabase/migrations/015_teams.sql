-- ========================================================
-- eTourNEX Platform — Phase 4 Section 1: Teams System
-- Migration 015 — Idempotent
-- ========================================================

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  tag           TEXT,                             -- Short team tag e.g. "NXS"
  description   TEXT,
  logo_url      TEXT,
  banner_url    TEXT,
  country       TEXT,
  captain_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  is_recruiting BOOLEAN NOT NULL DEFAULT true,
  wins          INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  tournaments_played INT NOT NULL DEFAULT 0,
  tournaments_won    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_captain    ON public.teams (captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug       ON public.teams (slug);
CREATE INDEX IF NOT EXISTS idx_teams_recruiting ON public.teams (is_recruiting) WHERE is_recruiting = true;

-- 2. TEAM MEMBER ROLES
-- captain  — full control (always matches teams.captain_id)
-- officer  — can invite / remove regular members
-- member   — regular member

CREATE TABLE IF NOT EXISTS public.team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('captain','officer','member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team   ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player ON public.team_members (player_id);

-- 3. TEAM INVITATIONS
-- type: 'invite'   — captain/officer invited the player
--       'request'  — player requested to join

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'invite'
                CHECK (type IN ('invite','request')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected','cancelled')),
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (team_id, player_id, status)   -- one pending action per player per team
);

CREATE INDEX IF NOT EXISTS idx_team_inv_team   ON public.team_invitations (team_id);
CREATE INDEX IF NOT EXISTS idx_team_inv_player ON public.team_invitations (player_id);
CREATE INDEX IF NOT EXISTS idx_team_inv_status ON public.team_invitations (status) WHERE status = 'pending';

-- ── Trigger: keep updated_at fresh on teams ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_teams_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_teams_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations  ENABLE ROW LEVEL SECURITY;

-- ── teams policies ────────────────────────────────────────────────────

-- Public can view all teams
DROP POLICY IF EXISTS "Public can view teams" ON public.teams;
CREATE POLICY "Public can view teams" ON public.teams
  FOR SELECT USING (true);

-- Authenticated users can create a team (becomes captain)
DROP POLICY IF EXISTS "Authenticated can create team" ON public.teams;
CREATE POLICY "Authenticated can create team" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = captain_id);

-- Captain can update their team
DROP POLICY IF EXISTS "Captain can update team" ON public.teams;
CREATE POLICY "Captain can update team" ON public.teams
  FOR UPDATE USING (auth.uid() = captain_id);

-- Captain can delete their team
DROP POLICY IF EXISTS "Captain can delete team" ON public.teams;
CREATE POLICY "Captain can delete team" ON public.teams
  FOR DELETE USING (auth.uid() = captain_id);

-- Admin can manage all teams
DROP POLICY IF EXISTS "Admin can manage all teams" ON public.teams;
CREATE POLICY "Admin can manage all teams" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── team_members policies ─────────────────────────────────────────────

-- Public can view team members
DROP POLICY IF EXISTS "Public can view team members" ON public.team_members;
CREATE POLICY "Public can view team members" ON public.team_members
  FOR SELECT USING (true);

-- Captain and officers can add members
DROP POLICY IF EXISTS "Captain and officer can insert members" ON public.team_members;
CREATE POLICY "Captain and officer can insert members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
  );

-- Captain and officers can update member roles
DROP POLICY IF EXISTS "Captain and officer can update members" ON public.team_members;
CREATE POLICY "Captain and officer can update members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
  );

-- Captain/officer can remove members; player can remove themselves (leave)
DROP POLICY IF EXISTS "Captain officer or self can delete member" ON public.team_members;
CREATE POLICY "Captain officer or self can delete member" ON public.team_members
  FOR DELETE USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
  );

-- ── team_invitations policies ─────────────────────────────────────────

-- Player or team captain/officer can view invitations
DROP POLICY IF EXISTS "Players and team staff can view invitations" ON public.team_invitations;
CREATE POLICY "Players and team staff can view invitations" ON public.team_invitations
  FOR SELECT USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.player_id = auth.uid()
        AND tm.role IN ('captain','officer')
    )
  );

-- Captain/officer can send invites; player can send join requests
DROP POLICY IF EXISTS "Create invitation or request" ON public.team_invitations;
CREATE POLICY "Create invitation or request" ON public.team_invitations
  FOR INSERT WITH CHECK (
    (
      -- Invite: sent by captain or officer
      type = 'invite'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_invitations.team_id
          AND tm.player_id = auth.uid()
          AND tm.role IN ('captain','officer')
      )
    )
    OR
    (
      -- Request: sent by the player themselves
      type = 'request'
      AND auth.uid() = player_id
    )
  );

-- Players can respond to their own invites; team staff can respond to requests
DROP POLICY IF EXISTS "Respond to invitation" ON public.team_invitations;
CREATE POLICY "Respond to invitation" ON public.team_invitations
  FOR UPDATE USING (
    (type = 'invite' AND player_id = auth.uid())
    OR (
      type = 'request'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_invitations.team_id
          AND tm.player_id = auth.uid()
          AND tm.role IN ('captain','officer')
      )
    )
  );

-- Admin can see all
DROP POLICY IF EXISTS "Admin can manage invitations" ON public.team_invitations;
CREATE POLICY "Admin can manage invitations" ON public.team_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
