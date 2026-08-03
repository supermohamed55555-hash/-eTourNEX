-- ========================================================
-- eTourNEX Platform - Phase 3 Section 6: Multi-Game & Category Support
-- Migration 012 — Idempotent
-- ========================================================

-- 1. ADD COLUMNS TO games TABLE IF NOT PRESENT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'category') THEN
    ALTER TABLE public.games ADD COLUMN category TEXT DEFAULT 'Sports';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'banner_url') THEN
    ALTER TABLE public.games ADD COLUMN banner_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'publisher') THEN
    ALTER TABLE public.games ADD COLUMN publisher TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'is_active') THEN
    ALTER TABLE public.games ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Index for category search
CREATE INDEX IF NOT EXISTS idx_games_category ON public.games (category, is_active);

-- 2. ROW LEVEL SECURITY ON games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active games" ON public.games;
CREATE POLICY "Public can view active games" ON public.games
  FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert games" ON public.games;
CREATE POLICY "Admins can insert games" ON public.games
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update games" ON public.games;
CREATE POLICY "Admins can update games" ON public.games
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete games" ON public.games;
CREATE POLICY "Admins can delete games" ON public.games
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. SEED DIVERSE ESPORTS GAMES ACROSS CATEGORIES (IDEMPOTENT)
INSERT INTO public.games (name, slug, category, publisher, icon_url, banner_url, is_active)
SELECT * FROM (VALUES
  ('eFootball 2025',             'efootball-2025',             'Sports',         'Konami',              '⚽', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80', true),
  ('EA SPORTS FC 24',            'ea-fc-24',                   'Sports',         'EA Sports',           '🎮', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80', true),
  ('Tekken 8',                   'tekken-8',                   'Fighting',       'Bandai Namco',        '🥊', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80', true),
  ('Street Fighter 6',           'street-fighter-6',           'Fighting',       'Capcom',              '🥋', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80', true),
  ('PUBG Mobile',                'pubg-mobile',                'Battle Royale',  'Tencent Games',       '🪂', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80', true),
  ('Valorant',                   'valorant',                   'FPS',            'Riot Games',          '🎯', 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&auto=format&fit=crop&q=80', true),
  ('Counter-Strike 2',           'cs2',                        'FPS',            'Valve',               '💣', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80', true),
  ('League of Legends',          'league-of-legends',          'MOBA',           'Riot Games',          '⚔️', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80', true),
  ('Mobile Legends: Bang Bang', 'mobile-legends',             'MOBA',           'Moonton',             '🛡️', 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?w=600&auto=format&fit=crop&q=80', true)
) AS v(name, slug, category, publisher, icon_url, banner_url, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.games WHERE slug = v.slug);
