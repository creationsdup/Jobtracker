-- Corrige C1 (relecture finale de feature/admin-dashboard) : la garde
-- `jsonb_typeof(props->'clicks') = 'number'` protège le TYPE de la valeur, pas son AMPLITUDE.
-- WHY: 100000000000000000000 (1e20) est un nombre JSON parfaitement légal. Il passe la garde,
-- passe le cast ::numeric, puis fait lever ::int en 22003 (integer out of range). Un tableau
-- ordinaire (la clé anon suffit) peut ainsi rendre admin_sessions, admin_boards et
-- admin_timeseries indisponibles pour toujours, jusqu'à suppression manuelle de la ligne.
-- On écrête donc la valeur (0 <= x <= 1000000 par session, sommes plafonnées à 2147483647)
-- avant tout cast en int. admin_meta() ne fait aucun cast : elle n'est pas concernée.
--
-- Au passage (demandé par le relecteur pendant qu'on est dans ces trois fonctions) :
-- `set search_path = public` devient `set search_path = public, pg_temp`, et "Application" est
-- qualifiée en public."Application". WHY: sans pg_temp explicitement en dernier dans la liste,
-- PostgreSQL consulte le schéma temporaire de la session AVANT public pour résoudre un nom de
-- relation non qualifié. Un rôle authenticated ordinaire peut créer une table temporaire nommée
-- "Application" et la faire lire à la place de la vraie table. Ici, ce n'est pas exploitable
-- (le contrôle is_admin() lève avant toute lecture pour un rôle non admin), mais la parade est
-- gratuite et évite une régression si l'ordre des vérifications change un jour.

create or replace function public.admin_boards(p_days integer default 30)
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
set search_path = public, pg_temp
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
      (select max(a."updatedAt") from public."Application" a where a."userId" = b.user_id::text)
    ) as last_seen_at,
    (select count(*)::int from public.usage_events e
      where e.user_id = b.user_id and e.name = 'session_started' and e.occurred_at >= v_since) as sessions,
    (select least(coalesce(sum(least(greatest((e.props->>'clicks')::numeric, 0), 1000000)), 0), 2147483647)::int
      from public.usage_events e
      where e.user_id = b.user_id and e.name = 'session_ended' and e.occurred_at >= v_since
        and jsonb_typeof(e.props->'clicks') = 'number') as clicks,
    (select count(*)::int from public."Application" a where a."userId" = b.user_id::text) as applications,
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

create or replace function public.admin_sessions(p_days integer default 30)
returns table (user_id uuid, clicks integer, duration_s integer, occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- WHY: props est du jsonb libre écrit par le client, text::int lèverait sur '2.5' ou une chaîne.
  -- Une seule ligne fautive suffirait à rendre la fonction inutilisable pour tout le monde.
  -- On passe par numeric pour arrondir avant de caster en int — et on écrête l'amplitude : la
  -- garde de type n'empêche pas 1e20 d'être un nombre JSON valide qui déborde un int.
  return query
  select
    e.user_id,
    case when jsonb_typeof(e.props->'clicks') = 'number'
         then least(greatest((e.props->>'clicks')::numeric, 0), 1000000)::int else 0 end,
    case when jsonb_typeof(e.props->'duration_s') = 'number'
         then least(greatest((e.props->>'duration_s')::numeric, 0), 1000000)::int else 0 end,
    e.occurred_at
  from public.usage_events e
  where e.name = 'session_ended'
    and e.occurred_at >= now() - make_interval(days => p_days);
end;
$$;

create or replace function public.admin_timeseries(p_days integer default 90)
returns table (day date, boards_created integer, boards_active integer, events integer, clicks integer)
language plpgsql
stable
security definer
set search_path = public, pg_temp
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
    (select least(coalesce(sum(least(greatest((e.props->>'clicks')::numeric, 0), 1000000)), 0), 2147483647)::int
      from public.usage_events e
      where e.name = 'session_ended' and e.occurred_at::date = g.day
        and jsonb_typeof(e.props->'clicks') = 'number')
  from (
    select generate_series(v_since::timestamp, current_date::timestamp, interval '1 day')::date as day
  ) g
  order by g.day;
end;
$$;
