-- ========================================================
-- eTourNEX Platform — Phase 4 Section 3: News & Articles Enhancements
-- Migration 017 — Idempotent
-- ========================================================

-- 1. ADD IS_FEATURED COLUMN TO NEWS_ARTICLES TABLE IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'news_articles' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.news_articles ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. INDEX FOR FEATURED AND PUBLISHED ARTICLES
CREATE INDEX IF NOT EXISTS idx_news_featured 
  ON public.news_articles (is_featured, is_published, published_at DESC);

-- 3. SET KICKOFF ARTICLE AS FEATURED (IDEMPOTENT)
UPDATE public.news_articles 
SET is_featured = true 
WHERE slug = 'etournex-season-4-kickoff';
