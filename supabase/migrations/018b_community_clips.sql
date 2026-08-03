-- ========================================================
-- eTourNEX Platform — Phase 4 Section 4: Community Clips
-- Migration 018b — Idempotent
-- ========================================================

-- 1. COMMUNITY CLIPS TABLE
CREATE TABLE IF NOT EXISTS public.community_clips (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id     UUID REFERENCES public.games(id) ON DELETE SET NULL,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  video_url   TEXT NOT NULL,
  thumbnail_url TEXT,
  category    TEXT NOT NULL DEFAULT 'highlight'
                CHECK (category IN ('highlight', 'tutorial', 'funny', 'teamplay')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_clips_player_id ON public.community_clips(player_id);
CREATE INDEX IF NOT EXISTS idx_community_clips_game_id ON public.community_clips(game_id);
CREATE INDEX IF NOT EXISTS idx_community_clips_category ON public.community_clips(category);

-- 2. CLIP LIKES TABLE
CREATE TABLE IF NOT EXISTS public.clip_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id    UUID NOT NULL REFERENCES public.community_clips(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clip_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_clip_likes_clip_id ON public.clip_likes(clip_id);

-- 3. ENABLE RLS
ALTER TABLE public.community_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES - COMMUNITY CLIPS
DROP POLICY IF EXISTS "Anyone can view community clips" ON public.community_clips;
CREATE POLICY "Anyone can view community clips" ON public.community_clips
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post clips" ON public.community_clips;
CREATE POLICY "Authenticated users can post clips" ON public.community_clips
  FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Owners or admins can delete clips" ON public.community_clips;
CREATE POLICY "Owners or admins can delete clips" ON public.community_clips
  FOR DELETE USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. RLS POLICIES - CLIP LIKES
DROP POLICY IF EXISTS "Anyone can view clip likes" ON public.clip_likes;
CREATE POLICY "Anyone can view clip likes" ON public.clip_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like clips" ON public.clip_likes;
CREATE POLICY "Authenticated users can like clips" ON public.clip_likes
  FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can remove their own likes" ON public.clip_likes;
CREATE POLICY "Users can remove their own likes" ON public.clip_likes
  FOR DELETE USING (player_id = auth.uid());
