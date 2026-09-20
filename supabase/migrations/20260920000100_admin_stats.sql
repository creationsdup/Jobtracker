-- Agrégation réservée à l'auteur. Voir docs/superpowers/specs/2026-09-20-admin-dashboard-design.md §4.3.
-- WHY: ces fonctions rendent des lignes brutes, pas des chiffres finis : moyennes, médianes,
-- entonnoir et rétention sont calculés en TypeScript (src/lib/adminStats.ts), où ils sont testables.

create function public.admin_meta()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- WHY: purge opportuniste, comme hit_rate_limit nettoie access_attempts à chaque appel.
  -- Évite d'avoir à activer pg_cron pour une table qui grossit très lentement.
  delete from public.usage_events where occurred_at < now() - interval '13 months';

  select jsonb_build_object(
    'measurement_start', (select min(occurred_at) from public.usage_events),
    'boards_total', (select count(*) from public.board_access),
    'events_total', (select count(*) from public.usage_events),
    'opted_out', (select count(*) from public.usage_preferences where opted_out)
  ) into v_result;

  return v_result;
end;
$$;

create function public.admin_boards(p_days integer default 30)
returns table (
  user_id uuid,
  created_at timestamptz,
  last_seen_at timestamptz,
  sessions integer,
  clicks integer,
  applications integer,
  active_days integer,
  returned_within_7d boolean,
  has_extension boolean,
  secured boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => p_days);
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    b.user_id,
    b.created_at,
    -- WHY: greatest ignore les NULL en PostgreSQL ; created_at n'étant jamais NULL,
    -- last_seen_at ne l'est jamais non plus, même pour un tableau sans aucune trace.
    greatest(
      b.created_at,
      b.last_opened_at,
      (select max(e.occurred_at) from public.usage_events e where e.user_id = b.user_id),
      (select max(a."updatedAt") from "Application" a where a."userId" = b.user_id::text)
    ) as last_seen_at,
    (select count(*)::int from public.usage_events e
      where e.user_id = b.user_id and e.name = 'session_started' and e.occurred_at >= v_since) as sessions,
    (select coalesce(sum((e.props->>'clicks')::int), 0)::int from public.usage_events e
      where e.user_id = b.user_id and e.name = 'session_ended' and e.occurred_at >= v_since
        and jsonb_typeof(e.props->'clicks') = 'number') as clicks,
    (select count(*)::int from "Application" a where a."userId" = b.user_id::text) as applications,
    (select count(distinct e.occurred_at::date)::int from public.usage_events e
      where e.user_id = b.user_id) as active_days,
    exists (select 1 from public.usage_events e
      where e.user_id = b.user_id
        and e.occurred_at < b.created_at + interval '7 days'
        and e.occurred_at::date > b.created_at::date) as returned_within_7d,
    exists (select 1 from public.usage_events e
      where e.user_id = b.user_id and e.name = 'extension_connected') as has_extension,
    -- WHY: on ne renvoie jamais l'email, seulement le fait qu'il soit personnel.
    -- boards.jobtracker.invalid est le domaine des emails générés (_shared/accessCode.ts).
    coalesce(lower(u.email) not like '%@boards.jobtracker.invalid', false) as secured
  from public.board_access b
  left join auth.users u on u.id = b.user_id;
end;
$$;

create function public.admin_sessions(p_days integer default 30)
returns table (user_id uuid, clicks integer, duration_s integer, occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    e.user_id,
    coalesce((e.props->>'clicks')::int, 0),
    coalesce((e.props->>'duration_s')::int, 0),
    e.occurred_at
  from public.usage_events e
  where e.name = 'session_ended'
    and e.occurred_at >= now() - make_interval(days => p_days);
end;
$$;

create function public.admin_timeseries(p_days integer default 90)
returns table (day date, boards_created integer, boards_active integer, events integer, clicks integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since date := (now() - make_interval(days => p_days))::date;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    g.day,
    (select count(*)::int from public.board_access b where b.created_at::date = g.day),
    (select count(distinct e.user_id)::int from public.usage_events e where e.occurred_at::date = g.day),
    (select count(*)::int from public.usage_events e where e.occurred_at::date = g.day),
    (select coalesce(sum((e.props->>'clicks')::int), 0)::int from public.usage_events e
      where e.name = 'session_ended' and e.occurred_at::date = g.day
        and jsonb_typeof(e.props->'clicks') = 'number')
  from (
    select generate_series(v_since::timestamp, current_date::timestamp, interval '1 day')::date as day
  ) g
  order by g.day;
end;
$$;

revoke all on function public.admin_meta() from public, anon;
revoke all on function public.admin_boards(integer) from public, anon;
revoke all on function public.admin_sessions(integer) from public, anon;
revoke all on function public.admin_timeseries(integer) from public, anon;

grant execute on function public.admin_meta() to authenticated;
grant execute on function public.admin_boards(integer) to authenticated;
grant execute on function public.admin_sessions(integer) to authenticated;
grant execute on function public.admin_timeseries(integer) to authenticated;
