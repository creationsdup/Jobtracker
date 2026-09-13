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

-- WHY: la purge doit passer sur toute la table, pas seulement le bucket courant, sinon un bucket
-- qui n'est plus jamais rappelé garde ses lignes indéfiniment (croissance non bornée).
create index access_attempts_window_start_idx on public.access_attempts (window_start);

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

  delete from public.access_attempts where window_start < now() - interval '24 hours';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Tables réservées à la service_role : RLS activée sans aucune policy, et aucun droit direct
-- pour anon/authenticated (défense en profondeur si une policy était ajoutée par erreur).
revoke all on table public.board_access, public.access_attempts from anon, authenticated;

-- WHY: suppression atomique (une transaction) des données d'un tableau, appelée par board-delete
-- avant admin.deleteUser. cv_documents et ats_analyses ne sont pas listées : elles cascadent déjà
-- depuis auth.users (contrainte on delete cascade).
create function public.delete_board_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from "TimelineStep" where "applicationId" in (select id from "Application" where "userId" = p_user_id::text);
  delete from "Application" where "userId" = p_user_id::text;
  delete from "OrgLogo" where "userId" = p_user_id::text;
  delete from "Profile" where id = p_user_id;
  delete from public.tasks where user_id = p_user_id;
  delete from public.user_goals where user_id = p_user_id;
end;
$$;

revoke all on function public.delete_board_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_board_data(uuid) to service_role;
