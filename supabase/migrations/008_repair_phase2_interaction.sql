-- ========================================================
-- eTourNEX Platform - Phase 2 Interaction Layer Repair Migration
-- ========================================================
-- Idempotent repair script to safely update schema, add missing columns,
-- and seed required achievements & badges without altering existing data.

DO $$
BEGIN

  -- 1. LEADERBOARD ENTRIES (points column)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard_entries' AND column_name = 'points'
  ) THEN
    ALTER TABLE public.leaderboard_entries ADD COLUMN points INT NOT NULL DEFAULT 0;
  END IF;

  -- 2. POINTS TRANSACTIONS TABLE
  CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INT NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Index for idempotency
  CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_idempotent
    ON public.points_transactions (player_id, reason, reference_id)
    WHERE reference_id IS NOT NULL;

  -- 3. ACHIEVEMENTS TABLE & REPAIR
  CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    icon TEXT,
    points_reward INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Ensure missing columns are present on achievements table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'title') THEN
    ALTER TABLE public.achievements ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'description') THEN
    ALTER TABLE public.achievements ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'icon') THEN
    ALTER TABLE public.achievements ADD COLUMN icon TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'points_reward') THEN
    ALTER TABLE public.achievements ADD COLUMN points_reward INT DEFAULT 0;
  END IF;

  -- Sync 'name' to 'title' if 'name' column exists and 'title' is null
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'achievements' AND column_name = 'name') THEN
    UPDATE public.achievements SET title = name WHERE title IS NULL AND name IS NOT NULL;
  END IF;

  -- 4. PLAYER ACHIEVEMENTS TABLE
  CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(player_id, achievement_id)
  );

  -- 5. BADGES TABLE & REPAIR
  CREATE TABLE IF NOT EXISTS public.badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'color') THEN
    ALTER TABLE public.badges ADD COLUMN color TEXT DEFAULT 'emerald';
  END IF;

  -- 6. PLAYER BADGES TABLE
  CREATE TABLE IF NOT EXISTS public.player_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(player_id, badge_id)
  );

  -- 7. NOTIFICATIONS TABLE & REPAIR
  CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    link_url TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Ensure missing columns are present on notifications table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'player_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
      ALTER TABLE public.notifications ADD COLUMN player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
      UPDATE public.notifications SET player_id = user_id WHERE player_id IS NULL;
    ELSE
      ALTER TABLE public.notifications ADD COLUMN player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'body') THEN
      ALTER TABLE public.notifications ADD COLUMN message TEXT;
      UPDATE public.notifications SET message = body WHERE message IS NULL;
    ELSE
      ALTER TABLE public.notifications ADD COLUMN message TEXT;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
      UPDATE public.notifications SET is_read = (read_at IS NOT NULL);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link_url') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
      ALTER TABLE public.notifications ADD COLUMN link_url TEXT;
      UPDATE public.notifications SET link_url = link WHERE link_url IS NULL;
    ELSE
      ALTER TABLE public.notifications ADD COLUMN link_url TEXT;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_id') THEN
    ALTER TABLE public.notifications ADD COLUMN reference_id TEXT;
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotent
    ON public.notifications (player_id, type, reference_id)
    WHERE reference_id IS NOT NULL;

END $$;

-- 8. SEED MINIMUM REQUIRED ACHIEVEMENTS & BADGES IDEMPOTENTLY

INSERT INTO public.achievements (id, title, description, icon, points_reward) VALUES
  ('first_match', 'First Match', 'Played your first competitive match on eTourNEX', 'Gamepad2', 50),
  ('first_win', 'First Victory', 'Won your first competitive match', 'Swords', 100),
  ('tournament_participant', 'Tournament Contender', 'Participated in a tournament', 'Trophy', 75),
  ('champion', 'Tournament Champion', 'Crowned champion of a tournament', 'Crown', 300)
ON CONFLICT (id) DO UPDATE SET
  title = COALESCE(EXCLUDED.title, achievements.title),
  description = COALESCE(EXCLUDED.description, achievements.description),
  icon = COALESCE(EXCLUDED.icon, achievements.icon),
  points_reward = COALESCE(EXCLUDED.points_reward, achievements.points_reward);

INSERT INTO public.badges (id, name, description, icon, color) VALUES
  ('verified', 'Verified Player', 'Verified account on eTourNEX', 'CheckCircle2', 'emerald'),
  ('champion', 'Tournament Champion', 'Has won at least one official tournament', 'Crown', 'amber'),
  ('organizer', 'Tournament Organizer', 'Official eTourNEX tournament organizer', 'ShieldCheck', 'purple')
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, badges.name),
  description = COALESCE(EXCLUDED.description, badges.description),
  icon = COALESCE(EXCLUDED.icon, badges.icon),
  color = COALESCE(EXCLUDED.color, badges.color);

-- 9. ROW LEVEL SECURITY (RLS) RE-ENABLEMENT & POLICIES

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POINTS TRANSACTIONS
DROP POLICY IF EXISTS "Points transactions readable by everyone" ON public.points_transactions;
CREATE POLICY "Points transactions readable by everyone" ON public.points_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert points transactions" ON public.points_transactions;
CREATE POLICY "Authenticated users can insert points transactions" ON public.points_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ACHIEVEMENTS
DROP POLICY IF EXISTS "Achievements readable by everyone" ON public.achievements;
CREATE POLICY "Achievements readable by everyone" ON public.achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PLAYER ACHIEVEMENTS
DROP POLICY IF EXISTS "Player achievements readable by everyone" ON public.player_achievements;
CREATE POLICY "Player achievements readable by everyone" ON public.player_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert player achievements" ON public.player_achievements;
CREATE POLICY "Authenticated users can insert player achievements" ON public.player_achievements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BADGES
DROP POLICY IF EXISTS "Badges readable by everyone" ON public.badges;
CREATE POLICY "Badges readable by everyone" ON public.badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PLAYER BADGES
DROP POLICY IF EXISTS "Player badges readable by everyone" ON public.player_badges;
CREATE POLICY "Player badges readable by everyone" ON public.player_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert player badges" ON public.player_badges;
CREATE POLICY "Authenticated users can insert player badges" ON public.player_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = player_id);
