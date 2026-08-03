-- ========================================================
-- eTourNEX Platform - Phase 2 Interaction Layer Migration
-- ========================================================

-- 1. ADD POINTS TO LEADERBOARD ENTRIES
alter table leaderboard_entries add column if not exists points int not null default 0;

-- 2. POINTS TRANSACTIONS TABLE
create table if not exists points_transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete cascade,
  points int not null,
  reason text not null check (reason in ('match_win', 'tournament_participation', 'tournament_champion', 'achievement_bonus')),
  reference_id text,
  created_at timestamptz default now()
);

-- Unique index to enforce idempotency when reference_id is specified
create unique index if not exists idx_points_tx_idempotent
  on points_transactions (player_id, reason, reference_id)
  where reference_id is not null;

-- 3. ACHIEVEMENTS TABLES
create table if not exists achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  points_reward int not null default 0,
  created_at timestamptz default now()
);

create table if not exists player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  unique(player_id, achievement_id)
);

-- 4. BADGES TABLES
create table if not exists badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  color text not null,
  created_at timestamptz default now()
);

create table if not exists player_badges (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete cascade,
  badge_id text not null references badges(id) on delete cascade,
  granted_at timestamptz default now(),
  unique(player_id, badge_id)
);

-- 5. NOTIFICATIONS TABLE
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('match_reminder', 'tournament_started', 'achievement_unlocked', 'badge_earned', 'points_earned', 'system')),
  is_read boolean not null default false,
  link_url text,
  reference_id text,
  created_at timestamptz default now()
);

create unique index if not exists idx_notifications_idempotent
  on notifications (player_id, type, reference_id)
  where reference_id is not null;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

alter table points_transactions enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;
alter table badges enable row level security;
alter table player_badges enable row level security;
alter table notifications enable row level security;

-- POINTS TRANSACTIONS
create policy "Points transactions readable by everyone" on points_transactions for select using (true);
create policy "Authenticated users can insert points transactions" on points_transactions for insert with check (auth.uid() is not null);

-- ACHIEVEMENTS
create policy "Achievements readable by everyone" on achievements for select using (true);
create policy "Admins can manage achievements" on achievements for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- PLAYER ACHIEVEMENTS
create policy "Player achievements readable by everyone" on player_achievements for select using (true);
create policy "Authenticated users can insert player achievements" on player_achievements for insert with check (auth.uid() is not null);

-- BADGES
create policy "Badges readable by everyone" on badges for select using (true);
create policy "Admins can manage badges" on badges for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- PLAYER BADGES
create policy "Player badges readable by everyone" on player_badges for select using (true);
create policy "Authenticated users can insert player badges" on player_badges for insert with check (auth.uid() is not null);

-- NOTIFICATIONS
create policy "Users can read own notifications" on notifications for select using (auth.uid() = player_id);
create policy "Authenticated users can insert notifications" on notifications for insert with check (auth.uid() is not null);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = player_id);
create policy "Users can delete own notifications" on notifications for delete using (auth.uid() = player_id);

-- ========================================================
-- SEED ACHIEVEMENTS & BADGES
-- ========================================================

insert into achievements (id, title, description, icon, points_reward) values
  ('first_match', 'First Match', 'Played your first competitive match on eTourNEX', 'Gamepad2', 50),
  ('first_win', 'First Victory', 'Won your first competitive match', 'Swords', 100),
  ('tournament_participant', 'Tournament Contender', 'Participated in a tournament', 'Trophy', 75),
  ('champion', 'Tournament Champion', 'Crowned champion of a tournament', 'Crown', 300)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  points_reward = excluded.points_reward;

insert into badges (id, name, description, icon, color) values
  ('verified', 'Verified Player', 'Verified account on eTourNEX', 'CheckCircle2', 'emerald'),
  ('champion', 'Tournament Champion', 'Has won at least one official tournament', 'Crown', 'amber'),
  ('organizer', 'Tournament Organizer', 'Official eTourNEX tournament organizer', 'ShieldCheck', 'purple')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color;
