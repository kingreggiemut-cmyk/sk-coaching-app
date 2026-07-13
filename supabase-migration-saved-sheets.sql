-- ============================================================
-- SCHEME KINGS — SAVED CALL SHEETS MIGRATION
-- ONE fully-customizable Game Plan call sheet per member, PER SCHEME.
-- The War Room's "Save Your Call Sheet" ticket UPSERTS here; the coaching
-- app's Call Sheets tab iframes it back (/playbooks/<scheme>.html?sheet=1).
-- The composite primary key (member_id, scheme_key) guarantees a single
-- sheet slot per scheme, so re-saving overwrites in place.
-- Paste into the Supabase SQL editor and run before testing Save Call Sheet.
-- ============================================================

create table public.saved_sheets (
  member_id   uuid        not null references public.members(member_id) on delete cascade,
  scheme_key  text        not null,                     -- e.g. "oregon-spread-cfb27"
  data        jsonb       not null default '{}'::jsonb, -- the full call-sheet (gpSheet) object
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  primary key (member_id, scheme_key)                   -- exactly ONE sheet per scheme
);

alter table public.saved_sheets enable row level security;

create policy "saved_sheets_select_own" on public.saved_sheets
  for select using (auth.uid() = member_id);
create policy "saved_sheets_insert_own" on public.saved_sheets
  for insert with check (auth.uid() = member_id);
create policy "saved_sheets_update_own" on public.saved_sheets
  for update using (auth.uid() = member_id);
create policy "saved_sheets_delete_own" on public.saved_sheets
  for delete using (auth.uid() = member_id);
