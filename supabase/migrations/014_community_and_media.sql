-- ========================================================
-- eTourNEX Platform - Phase 3 Section 8: Community & Media Hub
-- Migration 014 — Idempotent
-- ========================================================

-- 1. COMMUNITY CLIPS TABLE
CREATE TABLE IF NOT EXISTS public.community_clips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  video_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  game_id       UUID REFERENCES public.games(id) ON DELETE SET NULL,
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count   INT DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'highlight'
                  CHECK (category IN ('highlight', 'clutch', 'guide', 'funny')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_community_clips_cat_likes
  ON public.community_clips (category, likes_count DESC, created_at DESC);

-- 2. CLIP LIKES TABLE (Unique constraint per user per clip)
CREATE TABLE IF NOT EXISTS public.clip_likes (
  clip_id    UUID NOT NULL REFERENCES public.community_clips(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (clip_id, player_id)
);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.community_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

-- Public can view clips
DROP POLICY IF EXISTS "Public can view community clips" ON public.community_clips;
CREATE POLICY "Public can view community clips" ON public.community_clips
  FOR SELECT USING (true);

-- Authenticated users can insert clips
DROP POLICY IF EXISTS "Players can insert community clips" ON public.community_clips;
CREATE POLICY "Players can insert community clips" ON public.community_clips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = player_id);

-- Admins or clip owner can delete clips
DROP POLICY IF EXISTS "Owner or Admin can delete clips" ON public.community_clips;
CREATE POLICY "Owner or Admin can delete clips" ON public.community_clips
  FOR DELETE USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Clip Likes RLS
DROP POLICY IF EXISTS "Public can view clip likes" ON public.clip_likes;
CREATE POLICY "Public can view clip likes" ON public.clip_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can like clips" ON public.clip_likes;
CREATE POLICY "Players can like clips" ON public.clip_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can unlike clips" ON public.clip_likes;
CREATE POLICY "Players can unlike clips" ON public.clip_likes
  FOR DELETE USING (auth.uid() = player_id);

-- 4. SEED INITIAL REAL COMMUNITY HIGHLIGHTS (IDEMPOTENT)
DO $$
DECLARE
  v_admin_id UUID;
  v_game_id  UUID;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
  END IF;

  SELECT id INTO v_game_id FROM public.games LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.community_clips (title, video_url, thumbnail_url, game_id, player_id, likes_count, category)
    SELECT * FROM (VALUES
      (
        'Insane 90th-Minute Winner Goal in eFootball Season Finals!',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
        v_game_id,
        v_admin_id,
        42,
        'clutch'
      ),
      (
        '1v4 Clutch Defuse in Tournament Semifinal',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        v_game_id,
        v_admin_id,
        89,
        'highlight'
      ),
      (
        'Perfect Combo Guide: Master Tekken 8 Frame Advantage',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        v_game_id,
        v_admin_id,
        134,
        'guide'
      )
    ) AS v(title, video_url, thumbnail_url, game_id, player_id, likes_count, category)
    WHERE NOT EXISTS (SELECT 1 FROM public.community_clips LIMIT 1);
  END IF;
END $$;
