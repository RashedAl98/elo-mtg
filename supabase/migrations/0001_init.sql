-- MTG Powered Cube ELO League - initial schema
-- Apply this in the Supabase SQL editor (or via `supabase db push` if using the CLI).

create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default false
);

-- Only one season should be active at a time.
create unique index if not exists one_active_season
  on seasons (is_active)
  where is_active;

create table if not exists player_season_stats (
  player_id uuid not null references players(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  rating numeric not null default 1500,
  games_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  byes_received int not null default 0,
  primary key (player_id, season_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  event_date date not null,
  notes text
);

create table if not exists pods (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  seat_order uuid[] not null
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods(id) on delete cascade,
  round_number int not null,
  unique (pod_id, round_number)
);

-- outcome is null while a match is pending (round generated, result not yet recorded).
-- Byes get outcome = 'bye' and recorded_at set immediately since there's nothing to input.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player1_id uuid not null references players(id),
  player2_id uuid references players(id), -- null for a bye
  outcome text check (outcome is null or outcome in ('p1_2_0', 'p1_2_1', 'p2_2_0', 'p2_2_1', 'draw', 'bye')),
  p1_rating_before numeric,
  p1_rating_after numeric,
  p2_rating_before numeric,
  p2_rating_after numeric,
  recorded_at timestamptz
);

-- Row Level Security: anyone can read (public leaderboard/standings),
-- only the authenticated organizer account can write.
alter table players enable row level security;
alter table seasons enable row level security;
alter table player_season_stats enable row level security;
alter table events enable row level security;
alter table pods enable row level security;
alter table rounds enable row level security;
alter table matches enable row level security;

create policy "public read players" on players for select using (true);
create policy "public read seasons" on seasons for select using (true);
create policy "public read player_season_stats" on player_season_stats for select using (true);
create policy "public read events" on events for select using (true);
create policy "public read pods" on pods for select using (true);
create policy "public read rounds" on rounds for select using (true);
create policy "public read matches" on matches for select using (true);

create policy "organizer write players" on players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write seasons" on seasons for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write player_season_stats" on player_season_stats for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write events" on events for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write pods" on pods for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write rounds" on rounds for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "organizer write matches" on matches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
