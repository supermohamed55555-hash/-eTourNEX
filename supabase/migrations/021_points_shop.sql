-- ========================================================
-- eTourNEX Platform — Phase 5 Section 1: Points Shop
-- Migration 021 — Idempotent
-- ========================================================

-- 1. SHOP ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.shop_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL CHECK (category IN ('avatar_frame', 'name_color', 'profile_border', 'seasonal')),
  price        INT NOT NULL CHECK (price > 0),
  image_url    TEXT,
  css_value    TEXT NOT NULL, -- e.g. gradient colors, CSS classes, hex colors
  is_available BOOLEAN NOT NULL DEFAULT true,
  season       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_items_category ON public.shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_available ON public.shop_items(is_available);

-- 2. PLAYER INVENTORY TABLE (PERMANENT PURCHASES)
CREATE TABLE IF NOT EXISTS public.player_inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_player_inv_player ON public.player_inventory(player_id);

-- 3. PLAYER EQUIPPED ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.player_equipped_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_frame_id   UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
  name_color_id     UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
  profile_border_id UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_eq_player ON public.player_equipped_items(player_id);

-- 4. ENABLE RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_equipped_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES - SHOP ITEMS
DROP POLICY IF EXISTS "Public can view available shop items" ON public.shop_items;
CREATE POLICY "Public can view available shop items" ON public.shop_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage shop items" ON public.shop_items;
CREATE POLICY "Admin can manage shop items" ON public.shop_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. RLS POLICIES - PLAYER INVENTORY
DROP POLICY IF EXISTS "Public can view player inventory" ON public.player_inventory;
CREATE POLICY "Public can view player inventory" ON public.player_inventory
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Player can insert into inventory" ON public.player_inventory;
CREATE POLICY "Player can insert into inventory" ON public.player_inventory
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- 7. RLS POLICIES - PLAYER EQUIPPED ITEMS
DROP POLICY IF EXISTS "Public can view equipped items" ON public.player_equipped_items;
CREATE POLICY "Public can view equipped items" ON public.player_equipped_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Player can manage equipped items" ON public.player_equipped_items;
CREATE POLICY "Player can manage equipped items" ON public.player_equipped_items
  FOR ALL USING (auth.uid() = player_id);

-- 8. SEED COSMETIC SHOP ITEMS
INSERT INTO public.shop_items (name, description, category, price, css_value, image_url, season) VALUES
-- Avatar Frames
('Neon Cyber Ring', 'Electric neon cyan avatar frame for futuristic competitors', 'avatar_frame', 300, 'ring-2 ring-accent-neon shadow-[0_0_15px_#00f0ff]', NULL, NULL),
('Gold Champion Aura', 'Golden radiant glowing frame reserved for esports royalty', 'avatar_frame', 750, 'ring-2 ring-amber-400 shadow-[0_0_20px_#f59e0b]', NULL, NULL),
('Purple Void Eclipse', 'Deep shadowy void aura for stealthy tacticians', 'avatar_frame', 500, 'ring-2 ring-purple-500 shadow-[0_0_18px_#a855f7]', NULL, NULL),
('Firestorm Blaze', 'Blazing inferno flame frame for high-fraggers', 'avatar_frame', 600, 'ring-2 ring-rose-500 shadow-[0_0_18px_#f43f5e]', NULL, NULL),

-- Name Colors
('Neon Cyber Pink', 'Bright hot pink name glow', 'name_color', 200, 'text-[#ff007f] drop-shadow-[0_0_8px_#ff007f]', NULL, NULL),
('Golden Sovereign', 'Shimmering metallic gold text color', 'name_color', 400, 'text-amber-400 drop-shadow-[0_0_8px_#f59e0b]', NULL, NULL),
('Emerald Matrix', 'Digital green matrix code text color', 'name_color', 250, 'text-emerald-400 drop-shadow-[0_0_8px_#10b981]', NULL, NULL),
('Electric Cyan', 'Vibrant cyan laser font glow', 'name_color', 300, 'text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]', NULL, NULL),

-- Profile Borders
('Holographic Glass Border', 'Futuristic glassmorphic profile card border', 'profile_border', 500, 'border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)]', NULL, NULL),
('Imperial Ruby Border', 'Deep crimson crystal border for high rankers', 'profile_border', 800, 'border-2 border-rose-600/70 shadow-[0_0_25px_rgba(225,29,72,0.4)]', NULL, NULL),
('Obsidian Shadow Border', 'Dark obsidian armor border with purple highlights', 'profile_border', 650, 'border-2 border-purple-600/60 shadow-[0_0_25px_rgba(147,51,234,0.35)]', NULL, NULL),

-- Seasonal Cosmetics
('Season 4 Founders Crown', 'Exclusive Season 4 limited edition crown cosmetic', 'seasonal', 1000, 'ring-4 ring-amber-300 shadow-[0_0_30px_#fde047]', NULL, 'Season 4'),
('Frostbite Winter Flame', 'Chilly frosted ice frame from Season 4 winter series', 'seasonal', 850, 'ring-2 ring-blue-300 shadow-[0_0_20px_#93c5fd]', NULL, 'Season 4')
ON CONFLICT DO NOTHING;
