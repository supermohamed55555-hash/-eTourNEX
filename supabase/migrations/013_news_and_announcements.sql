-- ========================================================
-- eTourNEX Platform - Phase 3 Section 7: News & Announcements
-- Migration 013 — Idempotent
-- ========================================================

-- 1. NEWS ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.news_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT NOT NULL,
  excerpt         TEXT,
  cover_image_url TEXT,
  category        TEXT NOT NULL DEFAULT 'announcement'
                    CHECK (category IN ('announcement', 'patch_notes', 'esports_news', 'community')),
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published    BOOLEAN DEFAULT true,
  published_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_news_published_cat
  ON public.news_articles (is_published, category, published_at DESC);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published news" ON public.news_articles;
CREATE POLICY "Public can view published news" ON public.news_articles
  FOR SELECT USING (is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert news" ON public.news_articles;
CREATE POLICY "Admins can insert news" ON public.news_articles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update news" ON public.news_articles;
CREATE POLICY "Admins can update news" ON public.news_articles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete news" ON public.news_articles;
CREATE POLICY "Admins can delete news" ON public.news_articles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. SEED INITIAL REAL NEWS & ANNOUNCEMENTS (IDEMPOTENT)
INSERT INTO public.news_articles (title, slug, content, excerpt, cover_image_url, category, is_published)
SELECT * FROM (VALUES
  (
    'eTourNEX Season 4 Officially Kick-Off!',
    'etournex-season-4-kickoff',
    'Welcome competitors to Season 4 of eTourNEX! We are introducing expanded tournament formats, automated match dispute management, and new points rewards across all supported titles including eFootball 2025, Tekken 8, and Valorant. Register now in open tournaments and earn your spot on the global leaderboard!',
    'Season 4 introduces new points systems, automated match disputes, and expanded multi-game prize pools.',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    'announcement',
    true
  ),
  (
    'Match Dispute System & Fair Play Guidelines Updated',
    'match-dispute-system-fair-play-guidelines',
    'To guarantee fair play across all competitive brackets, eTourNEX has launched the integrated Match Dispute Portal. Players can now contest match reports directly from their Match Center with proof submissions. Admins will review screenshots and rule on match outcomes within minutes.',
    'Learn how the new integrated match dispute system ensures fair competition for all players.',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    'patch_notes',
    true
  ),
  (
    'Tekken 8 & EA FC 24 Join the Official Title Lineup',
    'tekken-8-ea-fc-24-joined-official-lineup',
    'We are thrilled to announce that Fighting and Sports titles Tekken 8 and EA SPORTS FC 24 have officially joined the eTourNEX competition roster! Weekly cups and custom organizer events will begin this weekend.',
    'Fighting and Sports games Tekken 8 and EA FC 24 are now live on eTourNEX with weekly prize pools.',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    'esports_news',
    true
  )
) AS v(title, slug, content, excerpt, cover_image_url, category, is_published)
WHERE NOT EXISTS (SELECT 1 FROM public.news_articles WHERE slug = v.slug);
