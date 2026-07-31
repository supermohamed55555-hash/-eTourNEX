-- ========================================================
-- eTourNEX Platform - Phase 1 / MVP Complete Postgres Schema
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  country text,
  bio text,
  avatar_url text,
  role text not null default 'player' check (role in ('admin','player')),
  email_confirmed boolean not null default false,
  created_at timestamptz default now()
);

-- 2. GAMES TABLE
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_url text,
  created_at timestamptz default now()
);

-- 3. TOURNAMENTS TABLE
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id),
  name text not null,
  description text,
  rules text,
  banner_url text,
  prize_pool text,
  format text not null default 'single_elimination' check (format in ('single_elimination')),
  status text not null default 'registration'
    check (status in ('registration','in_progress','completed','cancelled')),
  max_players int,
  starts_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 4. TOURNAMENT PARTICIPANTS TABLE
create table if not exists tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  player_id uuid references profiles(id),
  seed int,
  eliminated boolean not null default false,
  joined_at timestamptz default now(),
  unique(tournament_id, player_id)
);

-- 5. MATCHES TABLE (with DB-level screenshot check constraint)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  round_name text,
  round_order int not null,
  player_a_id uuid references tournament_participants(id),
  player_b_id uuid references tournament_participants(id),
  score_a int,
  score_b int,
  winner_id uuid references tournament_participants(id),
  status text not null default 'scheduled'
    check (status in ('scheduled','pending_review','confirmed')),
  proof_screenshot_url text,
  reported_by uuid references profiles(id),
  confirmed_by uuid references profiles(id),
  next_match_id uuid references matches(id),
  scheduled_for timestamptz,
  created_at timestamptz default now(),
  constraint check_proof_screenshot_required check (
    status != 'pending_review' or (proof_screenshot_url is not null and length(trim(proof_screenshot_url)) > 0)
  )
);

-- 6. LEADERBOARD ENTRIES TABLE
create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references profiles(id) unique,
  wins int not null default 0,
  losses int not null default 0,
  tournaments_played int not null default 0,
  tournaments_won int not null default 0,
  updated_at timestamptz default now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

alter table profiles enable row level security;
alter table games enable row level security;
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;
alter table matches enable row level security;
alter table leaderboard_entries enable row level security;

-- PROFILES POLICIES
create policy "Public profiles are readable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- GAMES POLICIES
create policy "Games readable by everyone" on games for select using (true);
create policy "Admins can insert/update games" on games for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- TOURNAMENTS POLICIES
create policy "Tournaments readable by everyone" on tournaments for select using (true);
create policy "Admins can insert tournaments" on tournaments for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update tournaments" on tournaments for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete tournaments" on tournaments for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- TOURNAMENT PARTICIPANTS POLICIES
create policy "Participants readable by everyone" on tournament_participants for select using (true);
create policy "Confirmed players can register for tournaments" on tournament_participants for insert with check (
  auth.uid() = player_id and
  exists (
    select 1 from profiles where id = auth.uid() and email_confirmed = true
  )
);
create policy "Players can leave tournament prior to start" on tournament_participants for delete using (
  auth.uid() = player_id and
  exists (
    select 1 from tournaments t where t.id = tournament_id and t.status = 'registration'
  )
);

-- MATCHES POLICIES
create policy "Matches readable by everyone" on matches for select using (true);
create policy "Players can report match results for their matches" on matches for update using (
  exists (
    select 1 from tournament_participants tp
    where (tp.id = player_a_id or tp.id = player_b_id) and tp.player_id = auth.uid()
  )
);
create policy "Admins can full manage matches" on matches for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- LEADERBOARD POLICIES
create policy "Leaderboard readable by everyone" on leaderboard_entries for select using (true);
create policy "Admins/system can modify leaderboard" on leaderboard_entries for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ========================================================
-- ROLE SECURITY TRIGGER (Strict DB-level role locking)
-- ========================================================

create or replace function public.prevent_unauthorized_role_change()
returns trigger as $$
begin
  if (old.role is distinct from new.role) then
    -- Only an existing admin (who is not the target user) can change roles via standard app requests.
    -- Database Superuser / SQL Editor updates (auth.uid() IS NULL) bypass this check during initial seeding.
    if auth.uid() is not null and not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and id != new.id
    ) then
      raise exception 'Unauthorized: Only an admin can manage user roles, and users cannot modify their own role.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_profile_role_security on public.profiles;
create trigger enforce_profile_role_security
  before update on public.profiles
  for each row execute procedure public.prevent_unauthorized_role_change();

-- ========================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ========================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, role, email_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'Player'),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id::text),
    'player', -- Always default to player role on signup
    coalesce((new.email_confirmed_at is not null), false)
  );

  insert into public.leaderboard_entries (player_id, wins, losses, tournaments_played, tournaments_won)
  values (new.id, 0, 0, 0, 0);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to sync email confirmation state if email is confirmed later
create or replace function public.handle_user_email_confirmation()
returns trigger as $$
begin
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null) then
    update public.profiles
    set email_confirmed = true
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute procedure public.handle_user_email_confirmation();

-- ========================================================
-- SEED DATA (Phase 1: eFootball game seed)
-- ========================================================

insert into games (id, name, slug, icon_url)
values (
  'a0000000-0000-0000-0000-000000000001',
  'eFootball 2025',
  'efootball',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=80'
) on conflict (slug) do nothing;

-- ========================================================
-- INITIAL BOOTSTRAP ADMIN SETUP (Run once in SQL Editor)
-- ========================================================
-- To elevate your first registered user account to Admin:
--
-- UPDATE public.profiles
-- SET role = 'admin', email_confirmed = true
-- WHERE username = 'your_registered_username';
--
-- Note: SQL executed in the Supabase Dashboard SQL Editor runs as Postgres Owner
-- (auth.uid() IS NULL), bypassing RLS and trigger restrictions for initial bootstrapping.
-- Once the first Admin exists, all subsequent user promotions are performed in UI at /admin/users.
