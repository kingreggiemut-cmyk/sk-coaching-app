-- ============================================================================
-- OWNER ANALYTICS  (run ONCE in Supabase → SQL Editor)
-- Creates a secure function that returns aggregate stats across ALL members.
-- It is SECURITY DEFINER (bypasses row-level security) but self-gates on the
-- caller's email, so ONLY kingreggiemut@gmail.com can ever get data back.
-- The coaching app calls it via db.rpc('owner_analytics') from the Analytics button.
-- Safe to re-run: "create or replace" just updates it.
-- ============================================================================
create or replace function public.owner_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  -- OWNER GATE: anyone else gets nothing.
  if coalesce(auth.jwt() ->> 'email', '') <> 'kingreggiemut@gmail.com' then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'generated_at',      now(),
    'members_total',     (select count(*) from auth.users),
    'signups_7d',        (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups_30d',       (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d',         (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d',        (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'sessions_total',    (select count(*) from public.coaching_sessions),
    'sessions_30d',      (select count(*) from public.coaching_sessions where created_at > now() - interval '30 days'),
    'sessions_members',  (select count(distinct member_id) from public.coaching_sessions),
    'drives_total',      (select count(*) from public.saved_drives),
    'drives_members',    (select count(distinct member_id) from public.saved_drives),
    'plays_saved_total', (select count(*) from public.saved_plays),
    'games_total',       (select count(*) from public.performance_cards),
    'games_members',     (select count(distinct member_id) from public.performance_cards),
    'top_schemes',       (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
                            select scheme_id, count(*)::int as games
                            from public.performance_cards
                            where scheme_id is not null
                            group by scheme_id
                            order by count(*) desc
                            limit 6) t)
  ) into result;

  return result;
end;
$$;

-- let signed-in users CALL it (the email gate inside decides who gets data)
grant execute on function public.owner_analytics() to authenticated;
