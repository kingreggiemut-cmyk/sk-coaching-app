-- ============================================================
-- SCHEME KINGS — THE PLAY DATABASE MIGRATION (2026-09-09)
-- Two tables for what a member does in the database and on a scheme page.
-- Same members table, same row-level security shape as saved_sheets.
-- Paste into the Supabase SQL editor and run ONCE before going live.
--
--   saved_library_plays  the stars in the play library (one row per play),
--                        with the playbook it was starred from
--   saved_plans          one plan per member per scheme: the inked calls,
--                        the calls added from the book, the board (tags and
--                        pins), notes, the presenter step. The whole plan
--                        object the scheme page keeps in the browser.
--
-- The call sheet itself keeps using saved_sheets (already live).
-- ============================================================

create table if not exists public.saved_library_plays (
  member_id   uuid        not null references public.members(member_id) on delete cascade,
  slug        text        not null,                     -- e.g. "tampa2-dollar-32"
  book        text,                                     -- the playbook key it was starred from, if any
  created_at  timestamptz default now(),
  primary key (member_id, slug)
);
alter table public.saved_library_plays enable row level security;
create policy "saved_library_plays_select_own" on public.saved_library_plays for select using (auth.uid() = member_id);
create policy "saved_library_plays_insert_own" on public.saved_library_plays for insert with check (auth.uid() = member_id);
create policy "saved_library_plays_update_own" on public.saved_library_plays for update using (auth.uid() = member_id);
create policy "saved_library_plays_delete_own" on public.saved_library_plays for delete using (auth.uid() = member_id);

create table if not exists public.saved_plans (
  member_id   uuid        not null references public.members(member_id) on delete cascade,
  scheme_key  text        not null,                     -- e.g. "alabama34"
  data        jsonb       not null default '{}'::jsonb, -- the plan object (sk_plan_<key>)
  updated_at  timestamptz default now(),
  primary key (member_id, scheme_key)
);
alter table public.saved_plans enable row level security;
create policy "saved_plans_select_own" on public.saved_plans for select using (auth.uid() = member_id);
create policy "saved_plans_insert_own" on public.saved_plans for insert with check (auth.uid() = member_id);
create policy "saved_plans_update_own" on public.saved_plans for update using (auth.uid() = member_id);
create policy "saved_plans_delete_own" on public.saved_plans for delete using (auth.uid() = member_id);
