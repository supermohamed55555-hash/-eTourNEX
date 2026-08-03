-- ========================================================
-- eTourNEX Platform - Phase 3 Section 4: Sponsors System
-- Migration 010 — Idempotent
-- ========================================================

-- 1. SPONSORS TABLE
CREATE TABLE IF NOT EXISTS public.sponsors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  tier         TEXT NOT NULL DEFAULT 'gold'
                 CHECK (tier IN ('title', 'platinum', 'gold', 'silver', 'partner')),
  logo_url     TEXT NOT NULL,
  website_url  TEXT,
  description  TEXT,
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_sponsors_active_tier
  ON public.sponsors (is_active, tier, sort_order);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Public can view active sponsors
DROP POLICY IF EXISTS "Public can view active sponsors" ON public.sponsors;
CREATE POLICY "Public can view active sponsors" ON public.sponsors
  FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins can insert sponsors
DROP POLICY IF EXISTS "Admins can insert sponsors" ON public.sponsors;
CREATE POLICY "Admins can insert sponsors" ON public.sponsors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update sponsors
DROP POLICY IF EXISTS "Admins can update sponsors" ON public.sponsors;
CREATE POLICY "Admins can update sponsors" ON public.sponsors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete sponsors
DROP POLICY IF EXISTS "Admins can delete sponsors" ON public.sponsors;
CREATE POLICY "Admins can delete sponsors" ON public.sponsors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. SEED INITIAL REAL SPONSORS (IDEMPOTENT)
INSERT INTO public.sponsors (name, tier, logo_url, website_url, description, sort_order, is_active)
SELECT * FROM (VALUES
  ('NexGen Gaming Systems', 'title',    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80', 'https://example.com/nexgen', 'Official Next-Gen Hardware and Tournament System Partner.', 1, true),
  ('CyberArena Global',    'platinum', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80', 'https://example.com/cyberarena', 'Premier esports venue operator and streaming provider.', 2, true),
  ('GIGA Peripherals',     'gold',     'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&auto=format&fit=crop&q=80', 'https://example.com/giga', 'High-performance gaming mice, keyboards, and gear.', 3, true),
  ('StormGear Esports',    'gold',     'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80', 'https://example.com/stormgear', 'Professional noise-isolating headsets and apparel.', 4, true),
  ('ArcNet Fiber',         'silver',   'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&auto=format&fit=crop&q=80', 'https://example.com/arcnet', 'Ultra-low latency fiber internet for competitive play.', 5, true),
  ('ProPlay Academy',      'partner',  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80', 'https://example.com/proplay', 'Esports coaching and talent development platform.', 6, true)
) AS v(name, tier, logo_url, website_url, description, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors LIMIT 1);
