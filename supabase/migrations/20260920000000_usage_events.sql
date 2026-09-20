-- Mesure d'usage (édition lite) : un événement = une action nommée d'un tableau.
-- Voir docs/superpowers/specs/2026-09-20-admin-dashboard-design.md §4.

create table public.usage_events (
  id bigint generated always as identity primary key,
  -- WHY: la valeur par défaut évite que le client ait à envoyer son identifiant ; la règle
  -- d'écriture ci-dessous le vérifie quand même, pour qu'un client modifié ne puisse pas mentir.
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'web',
  props jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint usage_events_source_check check (source in ('web', 'extension')),
  -- WHY: dictionnaire fermé. Un nom inconnu est refusé par la base : la collecte ne peut pas
  -- dériver au fil des modifications du client. 'follow_up_marked' est accepté d'avance, pour
  -- que la fusion de feature/follow-up-per-application n'exige pas de migration.
  constraint usage_events_name_check check (name in (
    'board_created', 'board_opened', 'session_started', 'session_ended',
    'application_added', 'application_status_changed', 'application_opened',
    'application_edited', 'application_deleted', 'follow_up_marked', 'view_switched',
    'code_revealed', 'code_rotated', 'email_secured',
    'extension_connected', 'extension_opened', 'extension_application_added',
    'extension_duplicate_blocked'
  ))
);

create index usage_events_user_time_idx on public.usage_events (user_id, occurred_at desc);
create index usage_events_time_idx on public.usage_events (occurred_at desc);
create index usage_events_name_time_idx on public.usage_events (name, occurred_at desc);

alter table public.usage_events enable row level security;

create table public.usage_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_out boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.usage_preferences enable row level security;

-- Liste blanche des administrateurs : réservée à la service_role (RLS activée, aucune policy),
-- comme board_access. Elle n'est lue que par les fonctions security definer.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- Écriture seule, pour son propre tableau, non antidatée, et refusée si l'utilisateur a dit non.
-- WHY: le refus est ainsi appliqué par la base, pas seulement par la confiance envers le client.
create policy "un tableau écrit ses propres événements"
  on public.usage_events for insert to authenticated
  with check (
    user_id = auth.uid()
    and occurred_at > now() - interval '1 hour'
    and occurred_at < now() + interval '5 minutes'
    and not exists (
      select 1 from public.usage_preferences p
      where p.user_id = auth.uid() and p.opted_out
    )
  );

create policy "un tableau lit sa préférence"
  on public.usage_preferences for select to authenticated using (user_id = auth.uid());
create policy "un tableau crée sa préférence"
  on public.usage_preferences for insert to authenticated with check (user_id = auth.uid());
create policy "un tableau change sa préférence"
  on public.usage_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- WHY: aucune règle de lecture sur usage_events. Personne ne lit la table directement, pas même
-- l'auteur : l'agrégation passe par les fonctions security definer de la tâche 2.
grant insert on table public.usage_events to authenticated;
revoke select, update, delete on table public.usage_events from anon, authenticated;
revoke all on table public.usage_events from anon;
grant select, insert, update on table public.usage_preferences to authenticated;
revoke all on table public.usage_preferences from anon;

-- WHY: seule fonction d'administration qui ne lève pas 'forbidden' — c'est elle qui décide si la
-- page /admin existe, elle doit donc répondre true ou false à tout utilisateur connecté.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
