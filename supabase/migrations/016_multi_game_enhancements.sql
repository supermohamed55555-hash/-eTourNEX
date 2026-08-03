-- ========================================================
-- eTourNEX Platform — Phase 4 Section 2: Multi-Game Enhancements
-- Migration 016 — Idempotent
-- ========================================================

-- 1. ADD COLOR COLUMN TO GAMES TABLE IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.games ADD COLUMN color TEXT DEFAULT '#8B5CF6';
  END IF;
END $$;

-- 2. INDEXES ON GAMES TABLE
CREATE INDEX IF NOT EXISTS idx_games_slug ON public.games (slug);
CREATE INDEX IF NOT EXISTS idx_games_active ON public.games (is_active);

-- 3. SEED REQUIRED GAMES WITH STYLISH BRAND COLORS & BANNERS (IDEMPOTENT)
INSERT INTO public.games (name, slug, category, publisher, icon_url, banner_url, color, is_active)
SELECT * FROM (VALUES
  ('PUBG Mobile',                'pubg-mobile',                'Battle Royale',  'Tencent Games',       '🪂', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80', '#F59E0B', true),
  ('FC 26',                      'fc-26',                      'Sports',         'EA Sports',           '⚽', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&auto=format&fit=crop&q=80', '#10B981', true),
  ('Valorant',                   'valorant',                   'FPS',            'Riot Games',          '🎯', 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=1200&auto=format&fit=crop&q=80', '#FF4655', true),
  ('CS2',                        'cs2',                        'FPS',            'Valve',               '💣', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80', '#DE9B35', true),
  ('Rocket League',              'rocket-league',              'Sports',         'Psyonix',             '🏎️', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80', '#0075FF', true),
  ('Tekken 8',                   'tekken-8',                   'Fighting',       'Bandai Namco',        '🥊', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80', '#EC4899', true),
  ('League of Legends',          'league-of-legends',          'MOBA',           'Riot Games',          '⚔️', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80', '#C89B3C', true)
) AS v(name, slug, category, publisher, icon_url, banner_url, color, is_active)
ON CONFLICT (slug) DO UPDATE SET
  color = EXCLUDED.color,
  banner_url = COALESCE(games.banner_url, EXCLUDED.banner_url),
  is_active = true;
