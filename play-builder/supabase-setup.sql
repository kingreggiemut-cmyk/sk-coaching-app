-- ============================================================================
-- Scheme Kings — Play Drawer · Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Project: ksgxrxqvnfpfhidxsxcs  (the SAME project as the coaching app + war room,
-- so members are already signed in — no second account.)
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- FORMATIONS — a member's own saved pre-snap alignments.
-- The 6 built-ins (2x2 Spread, 3x1 Spread, Doubles, Split Backs, I-Form, Empty)
-- live in code, not here. Only custom ones get rows.
-- `spec` is [{type,x,z}, ...] with x hash-relative and z LOS-relative.
-- ---------------------------------------------------------------------------
create table if not exists public.formations (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  spec        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (member_id, name)          -- one "Trips Right" per member; re-saving updates it
);

-- ---------------------------------------------------------------------------
-- DRAWN PLAYS — a member's authored plays.
--
-- NOTE: `spec` holds the play's OWN player positions. formation_id is provenance
-- only ("this play started from Trips Right") — a play NEVER reads its positions
-- back through the formation. That's deliberate: otherwise editing a formation
-- would silently rewrite every play built on it. on delete set null means
-- deleting a formation orphans the label, never the play.
--
-- Sharing: share_id is a short public slug. A row is readable by anyone ONLY
-- when is_public = true (see the policy below). Default is private.
-- ---------------------------------------------------------------------------
create table if not exists public.drawn_plays (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references auth.users(id) on delete cascade,
  name            text not null default 'Untitled play',
  spec            jsonb not null,
  formation_id    uuid references public.formations(id) on delete set null,
  formation_name  text,               -- carries built-ins too, which have no row
  share_id        text unique,
  is_public       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- columns added after the first release — no-ops on a fresh install
alter table public.drawn_plays add column if not exists formation_id   uuid references public.formations(id) on delete set null;
alter table public.drawn_plays add column if not exists formation_name text;
alter table public.drawn_plays add column if not exists share_id       text;
alter table public.drawn_plays add column if not exists is_public      boolean not null default false;
do $$ begin
  alter table public.drawn_plays add constraint drawn_plays_share_id_key unique (share_id);
exception when duplicate_table or duplicate_object then null;
end $$;

create index if not exists drawn_plays_member_idx  on public.drawn_plays (member_id, updated_at desc);
create index if not exists drawn_plays_share_idx   on public.drawn_plays (share_id) where share_id is not null;
create index if not exists formations_member_idx   on public.formations (member_id, name);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.formations  enable row level security;
alter table public.drawn_plays enable row level security;

drop policy if exists "own formations" on public.formations;
create policy "own formations" on public.formations
  for all using (auth.uid() = member_id) with check (auth.uid() = member_id);

-- a member does anything with their own plays
drop policy if exists "own plays" on public.drawn_plays;
create policy "own plays" on public.drawn_plays
  for all using (auth.uid() = member_id) with check (auth.uid() = member_id);

-- ANYONE (including signed-out visitors on a shared link) may READ a play that
-- has been explicitly made public. Read-only: no insert/update/delete here.
drop policy if exists "public shared plays" on public.drawn_plays;
create policy "public shared plays" on public.drawn_plays
  for select using (is_public = true);

-- ---------------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists drawn_plays_touch on public.drawn_plays;
create trigger drawn_plays_touch before update on public.drawn_plays
  for each row execute function public.touch_updated_at();

drop trigger if exists formations_touch on public.formations;
create trigger formations_touch before update on public.formations
  for each row execute function public.touch_updated_at();
