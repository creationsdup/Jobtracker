-- Accès par code (édition lite) : un tableau = un utilisateur Auth discret.
-- Tables réservées à la service_role (RLS activée, aucune policy).
-- Voir docs/superpowers/specs/2026-09-13-lite-access-code-design.md §4.3.

create table public.board_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  code_rotated_at timestamptz,
  last_opened_at timestamptz
);
alter table public.board_access enable row level security;

create table public.access_attempts (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.access_attempts enable row level security;

create function public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.access_attempts (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = public.access_attempts.hits + 1
  returning hits into v_hits;

  delete from public.access_attempts
  where bucket = p_bucket and window_start < now() - interval '24 hours';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
