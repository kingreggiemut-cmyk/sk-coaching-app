-- ============================================================
-- SCHEME KINGS — GAME SESSIONS (in-game companion mode)
-- One row per "Start a Game" session. Every useful tap in game
-- mode doubles as a data point: which scheme they started, which
-- situation tab they hit, which call they pulled up, which call
-- preceded which. Taps accumulate client-side and flush into the
-- jsonb column periodically + at End Game, so a mid-game phone
-- has one cheap upsert instead of a write per tap.
-- Run in the Supabase SQL editor before testing Start a Game.
-- ============================================================

create table if not exists public.game_sessions (
  session_id  uuid        primary key default gen_random_uuid(),
  member_id   uuid        not null references public.members(member_id) on delete cascade,
  scheme_key  text        not null,                      -- e.g. "oregon-spread-cfb27"
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,                               -- null while live
  result      text        check (result in ('Win','Loss')), -- one-tap W/L at End Game
  taps        jsonb       not null default '[]'::jsonb,  -- [{t:ms-offset, k:kind, v:value}, ...]
  tap_count   int         not null default 0,            -- cheap aggregate for analytics
  created_at  timestamptz default now()
);

alter table public.game_sessions enable row level security;

create policy "game_sessions_select_own" on public.game_sessions
  for select using (auth.uid() = member_id);
create policy "game_sessions_insert_own" on public.game_sessions
  for insert with check (auth.uid() = member_id);
create policy "game_sessions_update_own" on public.game_sessions
  for update using (auth.uid() = member_id);
create policy "game_sessions_delete_own" on public.game_sessions
  for delete using (auth.uid() = member_id);

create index if not exists game_sessions_member_idx on public.game_sessions (member_id, started_at desc);

-- ── SAVED PLAYS: the notebook ───────────────────────────────
-- Per-play notes are the moat: "only works if I motion first",
-- "audible out of this vs press". The coaching app already reads
-- a notes column; make sure it exists (older installs only had
-- the uuid-era `note` column).
alter table public.saved_plays
  add column if not exists notes text default '';
