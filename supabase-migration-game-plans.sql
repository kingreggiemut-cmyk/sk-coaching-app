-- ============================================================
-- SCHEME KINGS — GAME PLANS (the creed)
-- One row per member per scheme: the plan in THEIR own words
-- (creed keys, feed rules, self-scout rule). App territory —
-- deliberately separate from saved_sheets, which the War Room
-- clobbers with a full-row upsert on every "Save Your Call Sheet".
-- Run in the Supabase SQL editor. Until it runs, creeds persist
-- to localStorage only (per browser).
-- ============================================================

create table if not exists public.game_plans (
  member_id   uuid        not null references public.members(member_id) on delete cascade,
  scheme_key  text        not null,                      -- e.g. "oregon-spread-cfb27"
  data        jsonb       not null default '{}'::jsonb,  -- { creed: { keys, feed_*, when_*, stop_*, rule }, updated }
  updated_at  timestamptz default now(),
  primary key (member_id, scheme_key)
);

alter table public.game_plans enable row level security;

create policy "game_plans_select_own" on public.game_plans
  for select using (auth.uid() = member_id);
create policy "game_plans_insert_own" on public.game_plans
  for insert with check (auth.uid() = member_id);
create policy "game_plans_update_own" on public.game_plans
  for update using (auth.uid() = member_id);
create policy "game_plans_delete_own" on public.game_plans
  for delete using (auth.uid() = member_id);
