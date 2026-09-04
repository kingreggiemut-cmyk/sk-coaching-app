-- Daily Board: one row of state, shared between phone and desktop.
-- Paste this once into the Supabase SQL editor (same project the site uses).
-- Personal app, one person, so the anon key may read and write this one table.
begin;

create table if not exists public.day_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.day_state enable row level security;

drop policy if exists "day_state anon read" on public.day_state;
create policy "day_state anon read" on public.day_state
  for select to anon using (true);

drop policy if exists "day_state anon write" on public.day_state;
create policy "day_state anon write" on public.day_state
  for insert to anon with check (true);

drop policy if exists "day_state anon update" on public.day_state;
create policy "day_state anon update" on public.day_state
  for update to anon using (true) with check (true);

commit;
