-- ========================================================
-- eTourNEX Platform — Phase 4 Section 4: Community Interactions
-- Migration 018 — Idempotent
-- ========================================================

-- 1. ARTICLE LIKES
CREATE TABLE IF NOT EXISTS public.article_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_article_likes_article ON public.article_likes (article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_player  ON public.article_likes (player_id);

-- 2. ARTICLE COMMENTS
CREATE TABLE IF NOT EXISTS public.article_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  parent_id   UUID REFERENCES public.article_comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article ON public.article_comments (article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent  ON public.article_comments (parent_id) WHERE parent_id IS NOT NULL;

-- 3. TOURNAMENT LIKES
CREATE TABLE IF NOT EXISTS public.tournament_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_likes_tournament ON public.tournament_likes (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_likes_player     ON public.tournament_likes (player_id);

-- 4. TOURNAMENT COMMENTS
CREATE TABLE IF NOT EXISTS public.tournament_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  parent_id     UUID REFERENCES public.tournament_comments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_comments_tournament ON public.tournament_comments (tournament_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_comments_parent     ON public.tournament_comments (parent_id) WHERE parent_id IS NOT NULL;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────
ALTER TABLE public.article_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_comments ENABLE ROW LEVEL SECURITY;

-- ── article_likes policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view article likes" ON public.article_likes;
CREATE POLICY "Public can view article likes" ON public.article_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert article likes" ON public.article_likes;
CREATE POLICY "Players can insert article likes" ON public.article_likes FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can delete own article likes" ON public.article_likes;
CREATE POLICY "Players can delete own article likes" ON public.article_likes FOR DELETE USING (auth.uid() = player_id);

-- ── article_comments policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view article comments" ON public.article_comments;
CREATE POLICY "Public can view article comments" ON public.article_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert article comments" ON public.article_comments;
CREATE POLICY "Players can insert article comments" ON public.article_comments FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can delete own article comments" ON public.article_comments;
CREATE POLICY "Players can delete own article comments" ON public.article_comments FOR DELETE USING (
  auth.uid() = player_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── tournament_likes policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Public can view tournament likes" ON public.tournament_likes;
CREATE POLICY "Public can view tournament likes" ON public.tournament_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert tournament likes" ON public.tournament_likes;
CREATE POLICY "Players can insert tournament likes" ON public.tournament_likes FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can delete own tournament likes" ON public.tournament_likes;
CREATE POLICY "Players can delete own tournament likes" ON public.tournament_likes FOR DELETE USING (auth.uid() = player_id);

-- ── tournament_comments policies ──────────────────────────────────────
DROP POLICY IF EXISTS "Public can view tournament comments" ON public.tournament_comments;
CREATE POLICY "Public can view tournament comments" ON public.tournament_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert tournament comments" ON public.tournament_comments;
CREATE POLICY "Players can insert tournament comments" ON public.tournament_comments FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can delete own tournament comments" ON public.tournament_comments;
CREATE POLICY "Players can delete own tournament comments" ON public.tournament_comments FOR DELETE USING (
  auth.uid() = player_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
