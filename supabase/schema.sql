-- FFF League schema (World Cup 2026, 48 teams / 12 owners / 4 picks each)
-- Paste this into Supabase SQL Editor and click Run.

-- =========== PLAYERS (the 12 owners) ===========
create table if not exists players (
  id          serial primary key,
  name        text unique not null,
  slug        text unique not null,
  created_at  timestamptz default now()
);

-- =========== TEAMS (the 48 national sides) ===========
create table if not exists teams (
  id              text primary key,            -- short code e.g. 'USA','ARG'
  fd_id           int  unique,                 -- football-data.org id
  name            text not null,
  flag_emoji      text,
  group_letter    text,                        -- 'A'..'L'
  eliminated_round text                        -- null until eliminated. one of: GROUP, R32, R16, QF, SF, FINAL_RUNNER_UP, CHAMPION
);

-- =========== PICKS (who drafted which team) ===========
create table if not exists picks (
  id          serial primary key,
  player_id   int references players(id) on delete cascade,
  team_id     text references teams(id)  on delete cascade,
  pick_order  int,                             -- 1..4 for display order
  unique(player_id, team_id),
  unique(team_id)                              -- each team owned by exactly one player
);

-- =========== MATCHES (synced from football-data) ===========
create table if not exists matches (
  id            bigint primary key,            -- football-data match id
  stage         text not null,                 -- GROUP_STAGE / LAST_32 / LAST_16 / QUARTER_FINALS / SEMI_FINALS / FINAL / THIRD_PLACE
  matchday      int,
  utc_date      timestamptz,
  status        text,                          -- SCHEDULED / TIMED / IN_PLAY / PAUSED / FINISHED / POSTPONED / SUSPENDED / CANCELLED
  home_team     text references teams(id),
  away_team     text references teams(id),
  home_score    int default 0,
  away_score    int default 0,
  home_pk       int,                           -- penalty shootout score (null if no shootout)
  away_pk       int,
  winner        text,                          -- HOME_TEAM / AWAY_TEAM / DRAW (regulation/ET result; for KO, the side that advanced)
  duration      text,                          -- REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT
  raw           jsonb,
  updated_at    timestamptz default now()
);
create index if not exists matches_utc_date_idx on matches(utc_date);
create index if not exists matches_status_idx   on matches(status);

-- =========== GOALS ===========
create table if not exists goals (
  id            serial primary key,
  match_id      bigint references matches(id) on delete cascade,
  team_id       text references teams(id),
  scorer        text,
  minute        int,
  is_own_goal   bool default false,
  is_penalty_shootout bool default false,      -- shootout goals do NOT count
  unique(match_id, team_id, scorer, minute, is_penalty_shootout)
);

-- =========== SCORING EVENTS (derived; recomputable from above) ===========
create table if not exists scoring_events (
  id          serial primary key,
  player_id   int references players(id) on delete cascade,
  team_id     text references teams(id)  on delete cascade,
  match_id    bigint references matches(id) on delete cascade,
  kind        text not null,                  -- WIN / DRAW / GOAL / ADVANCE_R32 / ADVANCE_R16 / ADVANCE_QF / ADVANCE_SF / ADVANCE_FINAL / CHAMPION / WOODEN_BOTTOM_10 / WOODEN_BOTTOM_2
  points      int not null,
  detail      text,
  created_at  timestamptz default now()
);
create index if not exists scoring_events_player_idx on scoring_events(player_id);
create index if not exists scoring_events_kind_idx   on scoring_events(kind);

-- =========== SETTINGS (single-row key/value) ===========
create table if not exists settings (
  key   text primary key,
  value jsonb
);

-- =========== RLS: allow public read, no public write ===========
alter table players        enable row level security;
alter table teams          enable row level security;
alter table picks          enable row level security;
alter table matches        enable row level security;
alter table goals          enable row level security;
alter table scoring_events enable row level security;
alter table settings       enable row level security;

do $$ begin
  create policy "public read players"        on players        for select using (true);
  create policy "public read teams"          on teams          for select using (true);
  create policy "public read picks"          on picks          for select using (true);
  create policy "public read matches"        on matches        for select using (true);
  create policy "public read goals"          on goals          for select using (true);
  create policy "public read scoring_events" on scoring_events for select using (true);
  create policy "public read settings"       on settings       for select using (true);
exception when duplicate_object then null; end $$;

-- Service role bypasses RLS automatically, so writes from the cron/admin route work.
