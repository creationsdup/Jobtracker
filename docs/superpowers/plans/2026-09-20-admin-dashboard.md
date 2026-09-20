# Tableau de bord créateur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** donner à l'auteur de JobTracker une page `/admin` qui montre l'usage réel de l'édition lite (tableaux, dernière utilisation, candidatures, sessions, clics, extension), et la mesure qui l'alimente.

**Architecture :** une table `usage_events` écrite directement par le client, protégée par RLS (identité imposée par `auth.uid()`, refus de mesure appliqué à l'insertion) ; quatre fonctions SQL `security definer` réservées à une liste blanche renvoient les lignes brutes par tableau, par session et par jour ; tout le calcul de chiffres (moyennes, médianes, entonnoir, rétention) se fait en TypeScript pur, donc testable avec vitest. Aucune edge function, aucune clé `service_role` côté client.

**Tech Stack :** React 18 + TypeScript + Vite, `@supabase/supabase-js` v2, Tailwind, vitest. Aucune nouvelle dépendance npm.

**Spec :** `docs/superpowers/specs/2026-09-20-admin-dashboard-design.md`

## Global Constraints

- **Édition `lite` uniquement.** Tout le code de mesure et d'administration est derrière `FEATURES.accessCode`. L'édition `full` ne doit jamais toucher `usage_events`.
- **La mesure n'échoue jamais bruyamment.** Aucune erreur de `track` ne remonte à l'interface, ne rejette une promesse, ni ne bloque une action utilisateur. Erreurs réseau avalées, sans nouvelle tentative.
- **Aucune nouvelle dépendance npm**, ni de production ni de développement. Vérifié : vitest tourne ici en environnement `node` et `jsdom` n'est pas installé — tous les tests existants sont purs, les nouveaux le restent. Toute glu navigateur (écouteurs, `setInterval`) est donc injectée, jamais testée directement. Le graphique est du SVG écrit à la main, comme `src/components/library/ScoreRing.tsx`.
- **`/admin` est chargée à la demande** (`React.lazy`), pour ne jamais entrer dans le paquet que téléchargent les utilisateurs normaux.
- **Langue :** interface, commentaires et messages de commit en français. Commentaires `// WHY:` pour expliquer un choix non évident, comme partout dans ce dépôt.
- **Nommage SQL :** `snake_case` pour les nouvelles tables (comme `board_access`, `user_goals`, `tasks`). Les tables héritées gardent leurs guillemets (`"Application"`, `"userId"`).
- **Domaine des emails de tableau :** `boards.jobtracker.invalid` (`supabase/functions/_shared/accessCode.ts:6`). Un tableau « sécurisé » est un tableau dont l'email **ne** finit **pas** par ce domaine.
- **`npm test` et `npm run build:lite` doivent rester verts** à la fin de chaque tâche.
- **Rien n'est poussé** sans accord explicite de l'utilisateur.

## Écarts assumés par rapport à la spec

Trois points ont été précisés en écrivant le plan, après vérification dans le code. Ils tiennent la promesse de la spec mais changent le moyen :

1. **`admin_kpis` et `admin_funnel` n'existent pas en SQL.** La spec §4.3 les prévoyait ; le plan renvoie plutôt les lignes brutes (`admin_boards`, `admin_sessions`, `admin_timeseries`) et calcule moyennes, médianes, rétention et entonnoir en TypeScript pur. Raison : ce calcul devient testable avec vitest, alors qu'aucune infrastructure de test SQL n'existe dans ce dépôt. À l'échelle du projet (dizaines de tableaux), le volume transféré est négligeable.
2. **`board_deleted` est retiré du dictionnaire.** Vérifié : supprimer un tableau efface ses `usage_events` par cascade depuis `auth.users` — l'événement ne pourrait jamais être lu. Compter les suppressions demanderait un compteur côté serveur, hors périmètre ; c'est noté en §9 de la spec.
3. **`follow_up_marked` reste dans le dictionnaire mais n'a aucun appelant.** Vérifié : `nextFollowUpAt` n'existe pas sur `feature/lite-edition` (la relance vit sur `feature/follow-up-per-application`). Le nom est accepté par la base dès maintenant, pour ne pas exiger de migration quand cette branche sera fusionnée.
4. **`board_opened.via` vaut `'code' | 'shortcut' | 'created'`**, pas `'magic_link'`. Vérifié : une entrée par lien magique passe par `detectSessionInUrl` de supabase-js, hors du parcours `LiteAccessGate` — la distinguer demanderait un branchement disproportionné. Ces entrées restent visibles comme `session_started` sans `board_opened` qui précède.

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260920000000_usage_events.sql` | Tables `usage_events`, `usage_preferences`, `admin_users` ; règles d'accès ; `is_admin()` |
| `supabase/migrations/20260920000100_admin_stats.sql` | `admin_meta()`, `admin_boards()`, `admin_sessions()`, `admin_timeseries()` |
| `scripts/verify-usage-sql.mjs` | Vérification réelle des deux migrations contre la base (tableau de test créé puis supprimé) |
| `scripts/grant-admin.mjs` | Lister les tableaux, inscrire un identifiant dans `admin_users` |
| `src/lib/usage.ts` | Le traceur pur : file, lots, plafond, refus, compteur de clics. Aucune dépendance React ni Supabase |
| `src/lib/usage.test.ts` | Tests du traceur |
| `src/lib/usageClient.ts` | Branchement navigateur : client Supabase, écouteurs, `configureUsage` / `track` |
| `src/lib/usageClient.test.ts` | Tests du branchement |
| `src/hooks/useUsagePreference.ts` | Lecture et écriture du refus de mesure |
| `src/lib/adminStats.ts` | Calcul pur des chiffres clés, de l'entonnoir et des semaines |
| `src/lib/adminStats.test.ts` | Tests du calcul |
| `src/lib/adminApi.ts` | Les quatre appels RPC, typés |
| `src/pages/AdminPage.tsx` | La page, chargée à la demande |
| `src/components/admin/KpiGrid.tsx` | Bloc des chiffres clés |
| `src/components/admin/WeeklyChart.tsx` | Courbe hebdomadaire en SVG |
| `src/components/admin/BoardTable.tsx` | Tableau par tableau, triable |
| `src/components/admin/FunnelBars.tsx` | Entonnoir |

**Modifiés :**

| Fichier | Changement |
|---|---|
| `src/App.tsx` | Configurer la mesure, démarrer la session, brancher les actions sur les candidatures, ajouter la route `/admin` si administrateur |
| `src/hooks/useBoardAccess.ts` | `enterBoard` émet `board_created` / `board_opened` |
| `src/pages/BoardPage.tsx` | `view_switched` |
| `src/pages/MyBoardPage.tsx` | `code_rotated`, `email_secured`, section « Mesure d'usage », lien `/admin` pour l'auteur |
| `src/components/access/SavedCodePanel.tsx` | `code_revealed` |
| `src/pages/legal/PrivacyPage.tsx` | Paragraphe sur la mesure d'usage |
| `package.json` | Scripts `verify:usage` et `grant:admin` |
| `CLAUDE.md` | Section sur la mesure d'usage et la page `/admin` |

**À appliquer plus tard, sur `feature/chrome-extension`** (le code de l'extension n'est pas sur cette branche) : `extension/src/session.ts`, `extension/src/Popup.tsx`, `extension/src/addDraft.ts`. Voir Tâche 11.

---

### Tâche 1 : migration des tables et des règles d'accès

**Fichiers :**
- Créer : `supabase/migrations/20260920000000_usage_events.sql`
- Créer : `scripts/verify-usage-sql.mjs`
- Modifier : `package.json` (script `verify:usage`)

**Interfaces :**
- Consomme : `public.board_access` (migration `20260913120000_board_access.sql`), `auth.users`.
- Produit : les tables `public.usage_events(id, user_id, name, source, props, occurred_at)`, `public.usage_preferences(user_id, opted_out, updated_at)`, `public.admin_users(user_id, added_at)` et la fonction `public.is_admin() → boolean`. Les tâches 2, 3 et 6 s'appuient dessus.

- [ ] **Étape 1 : écrire la migration**

Créer `supabase/migrations/20260920000000_usage_events.sql` :

```sql
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
```

- [ ] **Étape 2 : écrire le script de vérification**

Créer `scripts/verify-usage-sql.mjs`. Il crée un vrai tableau de test, exerce chaque règle, puis le supprime — même approche que l'essai `JT_E2E=1` de l'extension.

```js
#!/usr/bin/env node
/**
 * verify-usage-sql — vérifie les migrations de mesure d'usage contre la base réelle.
 *
 * Crée un tableau de test, exerce les règles d'accès et les fonctions d'administration,
 * puis supprime le tableau. À lancer après `npm run db:push`.
 *
 * Usage : npm run verify:usage
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim()
  }
}
loadEnv()

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_KEY
if (!URL || !ANON || !SERVICE) {
  console.error('❌  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY et SUPABASE_SERVICE_KEY sont requis dans .env.local')
  process.exit(1)
}

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

const board = createClient(URL, ANON, { auth: { persistSession: false } })
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let userId = null

try {
  const created = await board.functions.invoke('board-create', { body: {} })
  if (created.error || !created.data?.tokenHash) throw new Error('board-create a échoué')
  const verified = await board.auth.verifyOtp({ token_hash: created.data.tokenHash, type: 'magiclink' })
  if (verified.error) throw new Error('verifyOtp a échoué')
  userId = verified.data.user.id
  console.log(`   tableau de test : ${userId}`)

  const ok = await board.from('usage_events').insert({ name: 'session_started' })
  check("un tableau écrit son propre événement", ok.error === null, ok.error?.message ?? '')

  const other = await board.from('usage_events').insert({ name: 'session_started', user_id: '00000000-0000-0000-0000-000000000000' })
  check("écrire pour un autre tableau est refusé", other.error !== null)

  const old = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const backdated = await board.from('usage_events').insert({ name: 'session_started', occurred_at: old })
  check('antidater de deux heures est refusé', backdated.error !== null)

  const unknown = await board.from('usage_events').insert({ name: 'pas_dans_le_dictionnaire' })
  check('un nom hors dictionnaire est refusé', unknown.error !== null)

  await board.from('usage_preferences').upsert({ user_id: userId, opted_out: true })
  const refused = await board.from('usage_events').insert({ name: 'session_started' })
  check("le refus de mesure bloque l'écriture", refused.error !== null)
  await board.from('usage_preferences').upsert({ user_id: userId, opted_out: false })

  const read = await board.from('usage_events').select('id')
  check('lire usage_events ne rend aucune ligne', (read.data?.length ?? 0) === 0)

  const notAdmin = await board.rpc('is_admin')
  check('is_admin rend false pour un tableau ordinaire', notAdmin.data === false, notAdmin.error?.message ?? '')

  const forbidden = await board.rpc('admin_boards', { p_days: 30 })
  check('admin_boards est refusée à un non-administrateur', forbidden.error !== null)

  await admin.from('admin_users').insert({ user_id: userId })
  const boards = await board.rpc('admin_boards', { p_days: 30 })
  check('admin_boards rend le tableau de test', (boards.data ?? []).some((row) => row.user_id === userId), boards.error?.message ?? '')
  const meta = await board.rpc('admin_meta')
  check('admin_meta répond', meta.error === null && meta.data !== null, meta.error?.message ?? '')
  const sessions = await board.rpc('admin_sessions', { p_days: 30 })
  check('admin_sessions répond', sessions.error === null, sessions.error?.message ?? '')
  const series = await board.rpc('admin_timeseries', { p_days: 7 })
  check('admin_timeseries rend 8 jours', (series.data ?? []).length === 8, series.error?.message ?? '')
  await admin.from('admin_users').delete().eq('user_id', userId)
} catch (error) {
  check('parcours complet', false, String(error))
} finally {
  if (userId) {
    const deleted = await board.functions.invoke('board-delete', { body: {} })
    check('tableau de test supprimé', !deleted.error)
  }
}

console.log(failures === 0 ? '\n✅  Toutes les vérifications passent.' : `\n❌  ${failures} vérification(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
```

Ajouter dans `package.json`, section `scripts` :

```json
"verify:usage": "node scripts/verify-usage-sql.mjs"
```

- [ ] **Étape 3 : lancer la vérification avant d'appliquer la migration**

Run : `npm run verify:usage`
Expected : ÉCHEC. Les premières vérifications échouent avec un message du genre `relation "public.usage_events" does not exist`, et le script sort en code 1.

- [ ] **Étape 4 : appliquer la migration**

Run : `npm run db:push`
Expected : la migration `20260920000000_usage_events.sql` est appliquée sans erreur.

- [ ] **Étape 5 : relancer la vérification**

Run : `npm run verify:usage`
Expected : toutes les lignes de la tâche 1 sont ✅ ; les quatre dernières (`admin_boards`, `admin_meta`, `admin_sessions`, `admin_timeseries`) restent ❌ — ces fonctions arrivent à la tâche 2. Le tableau de test doit être supprimé (`✅ tableau de test supprimé`).

- [ ] **Étape 6 : commit**

```bash
git add supabase/migrations/20260920000000_usage_events.sql scripts/verify-usage-sql.mjs package.json
git commit -m "feat(usage): table des événements d'usage et règles d'accès"
```

---

### Tâche 2 : fonctions d'agrégation réservées à l'auteur

**Fichiers :**
- Créer : `supabase/migrations/20260920000100_admin_stats.sql`
- Créer : `scripts/grant-admin.mjs`
- Modifier : `package.json` (script `grant:admin`)

**Interfaces :**
- Consomme : `public.usage_events`, `public.board_access`, `public.is_admin()`, `"Application"`, `auth.users`.
- Produit :
  - `admin_meta() → jsonb` : `{ measurement_start, boards_total, events_total, opted_out }` ; purge au passage les événements de plus de 13 mois.
  - `admin_boards(p_days integer default 30) → table(user_id uuid, created_at timestamptz, last_seen_at timestamptz, sessions integer, clicks integer, applications integer, active_days integer, returned_within_7d boolean, has_extension boolean, secured boolean)`
  - `admin_sessions(p_days integer default 30) → table(user_id uuid, clicks integer, duration_s integer, occurred_at timestamptz)`
  - `admin_timeseries(p_days integer default 90) → table(day date, boards_created integer, boards_active integer, events integer, clicks integer)`

  Les tâches 7, 8 et 9 consomment exactement ces noms de colonnes.

- [ ] **Étape 1 : écrire la migration**

Créer `supabase/migrations/20260920000100_admin_stats.sql` :

```sql
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
```

- [ ] **Étape 2 : lancer la vérification avant d'appliquer**

Run : `npm run verify:usage`
Expected : les vérifications de la tâche 1 passent ; `admin_boards`, `admin_meta`, `admin_sessions` et `admin_timeseries` échouent encore (`Could not find the function`).

- [ ] **Étape 3 : appliquer la migration**

Run : `npm run db:push`
Expected : `20260920000100_admin_stats.sql` appliquée sans erreur.

- [ ] **Étape 4 : relancer la vérification**

Run : `npm run verify:usage`
Expected : `✅  Toutes les vérifications passent.` et sortie en code 0.

- [ ] **Étape 5 : écrire le script d'inscription de l'auteur**

Créer `scripts/grant-admin.mjs` :

```js
#!/usr/bin/env node
/**
 * grant-admin — inscrit un tableau dans la liste blanche admin_users, qui ouvre /admin.
 *
 * Usage :
 *   npm run grant:admin -- --list          liste les tableaux, du plus récemment ouvert au plus ancien
 *   npm run grant:admin -- <user_id>       inscrit ce tableau
 *   npm run grant:admin -- --revoke <id>   le retire
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim()
  }
}
loadEnv()

const URL = process.env.VITE_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_KEY
if (!URL || !SERVICE) {
  console.error('❌  VITE_SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis dans .env.local')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const [flag, value] = process.argv.slice(2)

if (flag === '--list') {
  const { data: boards, error } = await admin
    .from('board_access')
    .select('user_id, created_at, last_opened_at')
    .order('last_opened_at', { ascending: false, nullsFirst: false })
  if (error) { console.error('❌ ', error.message); process.exit(1) }

  const { data: current } = await admin.from('admin_users').select('user_id')
  const admins = new Set((current ?? []).map((row) => row.user_id))

  for (const board of boards ?? []) {
    const { count } = await admin
      .from('Application')
      .select('id', { count: 'exact', head: true })
      .eq('userId', board.user_id)
    const opened = board.last_opened_at ? board.last_opened_at.slice(0, 10) : 'jamais'
    console.log(`${admins.has(board.user_id) ? '★' : ' '} ${board.user_id}  créé ${board.created_at.slice(0, 10)}  ouvert ${opened}  ${count ?? 0} candidature(s)`)
  }
  console.log('\n★ = déjà administrateur')
  process.exit(0)
}

if (flag === '--revoke') {
  const { error } = await admin.from('admin_users').delete().eq('user_id', value)
  if (error) { console.error('❌ ', error.message); process.exit(1) }
  console.log(`✅  ${value} retiré de admin_users`)
  process.exit(0)
}

if (!flag) {
  console.error('Usage : npm run grant:admin -- --list | <user_id> | --revoke <user_id>')
  process.exit(1)
}

const { error } = await admin.from('admin_users').upsert({ user_id: flag })
if (error) { console.error('❌ ', error.message); process.exit(1) }
console.log(`✅  ${flag} peut maintenant ouvrir /admin`)
```

Ajouter dans `package.json` :

```json
"grant:admin": "node scripts/grant-admin.mjs"
```

- [ ] **Étape 6 : lister les tableaux et inscrire celui de l'auteur**

Run : `npm run grant:admin -- --list`
Expected : la liste des tableaux avec leur date de création, leur dernière ouverture et leur nombre de candidatures.

**Demander à l'utilisateur lequel est le sien** (celui aux ~34 candidatures importées est un bon candidat, mais ne pas deviner : le lui faire confirmer), puis :

Run : `npm run grant:admin -- <user_id confirmé>`
Expected : `✅  <user_id> peut maintenant ouvrir /admin`

- [ ] **Étape 7 : commit**

```bash
git add supabase/migrations/20260920000100_admin_stats.sql scripts/grant-admin.mjs package.json
git commit -m "feat(usage): fonctions d'agrégation réservées à l'auteur"
```

---

### Tâche 3 : le traceur pur

**Fichiers :**
- Créer : `src/lib/usage.ts`
- Test : `src/lib/usage.test.ts`

**Interfaces :**
- Consomme : rien. Ce module n'importe ni React, ni Supabase, ni aucune API navigateur — c'est ce qui le rend testable et réutilisable par l'extension.
- Produit : `USAGE_EVENT_NAMES`, les types `UsageEventName`, `UsageSource`, `UsageEvent`, `UsageTracker`, et `createUsageTracker(options)`. Les tâches 4 et 11 s'en servent.

**Définition d'une session, à retenir pour toute la suite :** une session est **une période où l'onglet est au premier plan**, pas un chargement de page. Passer à un autre onglet ferme la session, revenir en ouvre une nouvelle. C'est ce qui rend « clics par session » bien défini.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/usage.test.ts` :

```ts
import { describe, expect, it, vi } from 'vitest'
import { createUsageTracker, type UsageEvent } from './usage'

function fakeSender() {
  const batches: UsageEvent[][] = []
  return { batches, send: async (events: UsageEvent[]) => { batches.push(events) } }
}

describe('createUsageTracker', () => {
  it('met un événement en file sans l’envoyer tout de suite', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    expect(tracker.pending()).toBe(1)
    expect(sender.batches).toHaveLength(0)
  })

  it('horodate avec l’horloge fournie et marque la source', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, source: 'extension', now: () => 1_700_000_000_000 })
    tracker.track('extension_opened')
    void tracker.flush()
    expect(sender.batches[0][0]).toMatchObject({
      name: 'extension_opened',
      source: 'extension',
      occurred_at: new Date(1_700_000_000_000).toISOString(),
    })
  })

  it('envoie et vide la file au flush', async () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    await tracker.flush()
    expect(sender.batches).toEqual([[expect.objectContaining({ name: 'session_started' })]])
    expect(tracker.pending()).toBe(0)
  })

  it('n’envoie rien quand la file est vide', async () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    await tracker.flush()
    expect(sender.batches).toHaveLength(0)
  })

  it('envoie tout seul dès que le lot est plein', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, batchSize: 3 })
    tracker.track('session_started')
    tracker.track('session_started')
    expect(sender.batches).toHaveLength(0)
    tracker.track('session_started')
    expect(sender.batches[0]).toHaveLength(3)
  })

  it('cesse d’enregistrer au-delà du plafond', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, batchSize: 1000, maxEvents: 2 })
    tracker.track('session_started')
    tracker.track('session_started')
    tracker.track('session_started')
    expect(tracker.pending()).toBe(2)
  })

  it('n’enregistre plus rien et jette la file après un refus', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    tracker.countClick()
    tracker.setOptedOut(true)
    tracker.track('session_started')
    expect(tracker.pending()).toBe(0)
    tracker.countClick()
    expect(tracker.takeClicks()).toBe(0)
  })

  it('avale une erreur d’envoi sans rejeter ni remettre en file', async () => {
    const send = vi.fn(async () => { throw new Error('réseau coupé') })
    const tracker = createUsageTracker({ send })
    tracker.track('session_started')
    await expect(tracker.flush()).resolves.toBeUndefined()
    expect(tracker.pending()).toBe(0)
  })

  it('compte les clics et remet le compteur à zéro quand on le lit', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.countClick()
    tracker.countClick()
    expect(tracker.takeClicks()).toBe(2)
    expect(tracker.takeClicks()).toBe(0)
  })
})
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `npx vitest run src/lib/usage.test.ts`
Expected : ÉCHEC — `Failed to resolve import "./usage"`.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/usage.ts` :

```ts
/**
 * Mesure d'usage (édition lite) : dictionnaire fermé d'actions, mise en file et envoi par lots.
 * Module pur — aucune dépendance React, Supabase ou navigateur, pour que l'extension le réutilise
 * tel quel et que tout soit testable. Le branchement navigateur vit dans usageClient.ts.
 */

export const USAGE_EVENT_NAMES = [
  'board_created', 'board_opened', 'session_started', 'session_ended',
  'application_added', 'application_status_changed', 'application_opened',
  'application_edited', 'application_deleted', 'follow_up_marked', 'view_switched',
  'code_revealed', 'code_rotated', 'email_secured',
  'extension_connected', 'extension_opened', 'extension_application_added',
  'extension_duplicate_blocked',
] as const

export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number]
export type UsageSource = 'web' | 'extension'

export interface UsageEvent {
  name: UsageEventName
  source: UsageSource
  props: Record<string, unknown>
  occurred_at: string
}

export interface UsageTrackerOptions {
  send: (events: UsageEvent[]) => Promise<void>
  source?: UsageSource
  now?: () => number
  batchSize?: number
  maxEvents?: number
}

export interface UsageTracker {
  track(name: UsageEventName, props?: Record<string, unknown>): void
  flush(): Promise<void>
  countClick(): void
  takeClicks(): number
  setOptedOut(optedOut: boolean): void
  pending(): number
}

export const DEFAULT_BATCH_SIZE = 20
/** WHY: garde-fou contre une boucle de code accidentelle, pas contre un abus (la base n'est pas en jeu). */
export const DEFAULT_MAX_EVENTS = 500

export function createUsageTracker(options: UsageTrackerOptions): UsageTracker {
  const {
    send,
    source = 'web',
    now = Date.now,
    batchSize = DEFAULT_BATCH_SIZE,
    maxEvents = DEFAULT_MAX_EVENTS,
  } = options

  let queue: UsageEvent[] = []
  let recorded = 0
  let clicks = 0
  let optedOut = false

  async function flush(): Promise<void> {
    if (queue.length === 0) return
    const batch = queue
    queue = []
    try {
      await send(batch)
    } catch {
      // WHY: jamais de nouvelle tentative. Un lot perdu vaut mieux qu'une file qui grossit hors
      // ligne puis part d'un coup, refusée de toute façon par la fenêtre d'une heure de la règle RLS.
    }
  }

  return {
    track(name, props = {}) {
      if (optedOut || recorded >= maxEvents) return
      recorded += 1
      queue.push({ name, source, props, occurred_at: new Date(now()).toISOString() })
      if (queue.length >= batchSize) void flush()
    },
    flush,
    countClick() {
      if (!optedOut) clicks += 1
    },
    takeClicks() {
      const total = clicks
      clicks = 0
      return total
    },
    setOptedOut(value) {
      optedOut = value
      if (value) {
        queue = []
        clicks = 0
      }
    },
    pending() {
      return queue.length
    },
  }
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

Run : `npx vitest run src/lib/usage.test.ts`
Expected : 9 tests passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/usage.ts src/lib/usage.test.ts
git commit -m "feat(usage): traceur pur avec file, lots et refus de mesure"
```

---

### Tâche 4 : le branchement navigateur

**Fichiers :**
- Créer : `src/lib/usageClient.ts`
- Test : `src/lib/usageClient.test.ts`

**Interfaces :**
- Consomme : `createUsageTracker`, `UsageEventName`, `UsageSource` de `src/lib/usage.ts`.
- Produit :
  - `configureUsage({ client, source? }): void` — idempotent, le deuxième appel ne fait rien.
  - `track(name: UsageEventName, props?: Record<string, unknown>): void` — sans effet si `configureUsage` n'a pas été appelé.
  - `setUsageOptedOut(optedOut: boolean): void`
  - `flushUsage(): Promise<void>` — vide la file tout de suite (utilisé par l'extension, tâche 11).
  - `startUsageSession(targets: SessionTargets): () => void` — rend la fonction d'arrêt.
  - `browserTargets(): SessionTargets`
  - `resetUsage(): void` — pour les tests uniquement.
  - `interface InsertOnlyClient` — exportée pour que les tests aient un type à viser plutôt qu'un `as never`.
  - `interface SessionTargets { addClickListener, addVisibilityListener, setInterval, now }`

  Les tâches 5, 6 et 11 appellent `configureUsage`, `track`, `setUsageOptedOut` et `startUsageSession`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/usageClient.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureUsage, resetUsage, setUsageOptedOut, startUsageSession, track,
  type InsertOnlyClient, type SessionTargets,
} from './usageClient'

function fakeClient() {
  const inserted: unknown[][] = []
  const insert = vi.fn(async (rows: Record<string, unknown>[]) => { inserted.push(rows); return { error: null } })
  return { inserted, insert, client: { from: () => ({ insert }) } satisfies InsertOnlyClient }
}

function fakeTargets() {
  let clickHandler = () => {}
  let visibilityHandler = (_visible: boolean) => {}
  let time = 0
  return {
    click: () => clickHandler(),
    hide: () => visibilityHandler(false),
    show: () => visibilityHandler(true),
    advance: (seconds: number) => { time += seconds * 1000 },
    targets: {
      addClickListener: (handler) => { clickHandler = handler; return () => { clickHandler = () => {} } },
      addVisibilityListener: (handler) => { visibilityHandler = handler; return () => { visibilityHandler = () => {} } },
      setInterval: () => () => {},
      now: () => time,
    } satisfies SessionTargets,
  }
}

beforeEach(() => resetUsage())

describe('usageClient', () => {
  it('ne fait rien tant que la mesure n’est pas configurée', () => {
    expect(() => track('session_started')).not.toThrow()
    const { targets } = fakeTargets()
    const stop = startUsageSession(targets)
    expect(() => stop()).not.toThrow()
  })

  it('insère les événements dans usage_events sans envoyer d’identifiant', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    track('application_added', { status: 'SENT' })
    const { targets } = fakeTargets()
    const stop = startUsageSession(targets)
    stop()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as Record<string, unknown>[]
    expect(rows.some((row) => row.name === 'application_added' && row.source === 'web')).toBe(true)
    // WHY: user_id vient du défaut auth.uid() en base ; le client ne doit jamais l’envoyer.
    expect(rows.every((row) => !('user_id' in row))).toBe(true)
  })

  it('ouvre la session, compte les clics et les rend au masquage', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.click()
    scene.click()
    scene.advance(42)
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string; props: Record<string, unknown> }[]
    expect(rows.filter((row) => row.name === 'session_started')).toHaveLength(1)
    expect(rows.find((row) => row.name === 'session_ended')?.props).toEqual({ clicks: 2, duration_s: 42 })
  })

  it('rouvre une session au retour au premier plan', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.hide()
    scene.show()
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string }[]
    expect(rows.filter((row) => row.name === 'session_started')).toHaveLength(2)
    expect(rows.filter((row) => row.name === 'session_ended')).toHaveLength(2)
  })

  it('ne ferme pas deux fois la même session', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    const stop = startUsageSession(scene.targets)
    scene.hide()
    stop()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string }[]
    expect(rows.filter((row) => row.name === 'session_ended')).toHaveLength(1)
  })

  it('n’envoie plus rien après un refus', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    setUsageOptedOut(true)
    track('application_added')
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fake.inserted.flat()).toHaveLength(0)
  })

  it('avale une erreur renvoyée par Supabase', async () => {
    const insert = vi.fn(async () => ({ error: { message: 'refusé par la règle' } }))
    configureUsage({ client: { from: () => ({ insert }) } satisfies InsertOnlyClient })
    track('application_added')
    const scene = fakeTargets()
    const stop = startUsageSession(scene.targets)
    expect(() => stop()).not.toThrow()
  })
})
```

**Note :** aucun test ne touche le DOM — tout passe par `SessionTargets`. `browserTargets()` reste la seule glu non testée automatiquement : c'est délibéré (dix lignes d'`addEventListener`, et l'environnement de test est `node`). Elle est vérifiée à la main à l'étape 6 de la tâche 5.

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `npx vitest run src/lib/usageClient.test.ts`
Expected : ÉCHEC — `Failed to resolve import "./usageClient"`.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/usageClient.ts` :

```ts
import { createUsageTracker, type UsageEventName, type UsageSource, type UsageTracker } from './usage'

const FLUSH_INTERVAL_MS = 10_000

/** Le strict minimum attendu d'un client Supabase : de quoi insérer dans usage_events. */
export interface InsertOnlyClient {
  from(table: string): { insert(rows: Record<string, unknown>[]): Promise<{ error: { message: string } | null }> }
}

export interface SessionTargets {
  addClickListener(handler: () => void): () => void
  addVisibilityListener(handler: (visible: boolean) => void): () => void
  setInterval(handler: () => void, ms: number): () => void
  now(): number
}

let tracker: UsageTracker | null = null

export function configureUsage({ client, source = 'web' }: { client: InsertOnlyClient; source?: UsageSource }): void {
  // WHY: idempotent — useBoardAccess configure la mesure dès l'entrée dans le tableau, et l'effet
  // de App la configure aussi au montage ; le deuxième appel ne doit pas repartir de zéro.
  if (tracker) return
  tracker = createUsageTracker({
    source,
    send: async (events) => {
      // WHY: user_id n'est jamais envoyé — la colonne vaut auth.uid() par défaut, et la règle
      // d'écriture le vérifie. Rien à falsifier côté client.
      const rows = events.map(({ name, source: eventSource, props, occurred_at }) => ({
        name, source: eventSource, props, occurred_at,
      }))
      const { error } = await client.from('usage_events').insert(rows)
      if (error) throw new Error(error.message)
    },
  })
}

export function track(name: UsageEventName, props?: Record<string, unknown>): void {
  tracker?.track(name, props)
}

export function setUsageOptedOut(optedOut: boolean): void {
  tracker?.setOptedOut(optedOut)
}

/** Vide la file tout de suite. Utile là où aucune session ne le fait, comme la fenêtre de l'extension. */
export function flushUsage(): Promise<void> {
  return tracker?.flush() ?? Promise.resolve()
}

/** Pour les tests : oublie la configuration en cours. */
export function resetUsage(): void {
  tracker = null
}

/**
 * Une session = une période où l'onglet est au premier plan. Passer à un autre onglet la ferme,
 * revenir en ouvre une nouvelle : c'est ce qui donne un sens à « clics par session ».
 */
export function startUsageSession(targets: SessionTargets): () => void {
  const current = tracker
  if (!current) return () => {}

  let startedAt = targets.now()
  let open = false

  function begin() {
    if (open) return
    open = true
    startedAt = targets.now()
    current.track('session_started')
  }

  function end() {
    if (!open) return
    open = false
    current.track('session_ended', {
      clicks: current.takeClicks(),
      duration_s: Math.max(0, Math.round((targets.now() - startedAt) / 1000)),
    })
    void current.flush()
  }

  begin()
  const offClick = targets.addClickListener(() => current.countClick())
  const offVisibility = targets.addVisibilityListener((visible) => (visible ? begin() : end()))
  const stopInterval = targets.setInterval(() => void current.flush(), FLUSH_INTERVAL_MS)

  return () => {
    offClick()
    offVisibility()
    stopInterval()
    end()
  }
}

export function browserTargets(): SessionTargets {
  return {
    addClickListener(handler) {
      // WHY: en capture, pour compter aussi les clics dont un gestionnaire arrête la propagation.
      document.addEventListener('click', handler, true)
      return () => document.removeEventListener('click', handler, true)
    },
    addVisibilityListener(handler) {
      const onVisibility = () => handler(document.visibilityState === 'visible')
      // WHY: pagehide couvre la fermeture de l'onglet et le retour arrière, où visibilitychange
      // n'est pas garanti sur les navigateurs mobiles.
      const onHide = () => handler(false)
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('pagehide', onHide)
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('pagehide', onHide)
      }
    },
    setInterval(handler, ms) {
      const id = window.setInterval(handler, ms)
      return () => window.clearInterval(id)
    },
    now: () => Date.now(),
  }
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

Run : `npx vitest run src/lib/usageClient.test.ts`
Expected : 7 tests passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/usageClient.ts src/lib/usageClient.test.ts
git commit -m "feat(usage): branchement navigateur, sessions et compteur de clics"
```

---

### Tâche 5 : brancher les actions du site

**Fichiers :**
- Modifier : `src/App.tsx`
- Modifier : `src/hooks/useBoardAccess.ts`
- Modifier : `src/components/access/LiteAccessGate.tsx`
- Modifier : `src/pages/BoardPage.tsx`
- Modifier : `src/pages/MyBoardPage.tsx`
- Modifier : `src/components/access/SavedCodePanel.tsx`

**Interfaces :**
- Consomme : `configureUsage`, `track`, `startUsageSession`, `browserTargets`, `setUsageOptedOut` de `src/lib/usageClient.ts`.
- Produit : `useBoardAccess` expose désormais `enterBoard(tokenHash, code?, via?)` et `openBoard(code, via?)` avec `type BoardOpenVia = 'code' | 'shortcut' | 'created'` exporté depuis `src/hooks/useBoardAccess.ts`. La tâche 6 réutilise `setUsageOptedOut`.

- [ ] **Étape 1 : configurer la mesure et ouvrir la session dans `App.tsx`**

Ajouter les imports :

```tsx
import { supabase } from '@/lib/supabase'
import { browserTargets, configureUsage, setUsageOptedOut, startUsageSession, track } from '@/lib/usageClient'
```

Puis, parmi les autres `useEffect` de `App` (avant le `if (authLoading)`) :

```tsx
useEffect(() => {
  if (!FEATURES.accessCode || !isAuthenticated) return
  configureUsage({ client: supabase })
  // WHY: la préférence arrive après coup ; les quelques événements émis entre-temps sont refusés
  // par la règle RLS si l'utilisateur a dit non — la base reste l'autorité, pas ce chargement.
  void supabase
    .from('usage_preferences')
    .select('opted_out')
    .maybeSingle()
    .then(({ data }) => setUsageOptedOut(data?.opted_out === true))
  return startUsageSession(browserTargets())
}, [isAuthenticated])
```

- [ ] **Étape 2 : brancher les actions sur les candidatures dans `App.tsx`**

Dans `handleSave`, capturer le mode **avant** l'attente, puis marquer le succès :

```tsx
async function handleSave(data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) {
  setSaveError(null)
  // WHY: lu avant l'await — editingApp est remis à null juste après, la valeur aurait changé.
  const editing = editingApp !== null
  const err = editing
    ? await updateApplication(editingApp!.id, data)
    : await addApplication(data)
  if (err) { setSaveError(err); return }
  track(editing ? 'application_edited' : 'application_added', { status: data.status })
  setFormOpen(false)
  setEditingApp(null)
}
```

Dans `handleDelete`, après la suppression des étapes :

```tsx
track('application_deleted')
setDetailApp(null)
```

Dans `handleOpenDetail`, juste après `setDetailApp(current)` :

```tsx
track('application_opened')
```

Ajouter deux enveloppes autour de `updateStatus`, pour distinguer le glisser-déposer du menu :

```tsx
// WHY: une seule fabrique — les deux chemins ne diffèrent que par la provenance.
const changeStatusVia = useCallback(
  (via: 'drag' | 'menu') => async (id: string, status: ApplicationStatus) => {
    const from = applications.find((a) => a.id === id)?.status
    const err = await updateStatus(id, status)
    if (!err) track('application_status_changed', { from, to: status, via })
    return err
  },
  [applications, updateStatus],
)

const changeStatusByDrag = useMemo(() => changeStatusVia('drag'), [changeStatusVia])
const changeStatusByMenu = useMemo(() => changeStatusVia('menu'), [changeStatusVia])
```

`useMemo` est déjà importé dans `App.tsx`.

Ajouter `import type { ApplicationStatus } from '@/lib/types'` à l'import de types existant, puis remplacer les usages :
- `<BoardPage … onStatusChange={changeStatusByDrag} …>` (c'est le chemin du kanban, donc du glisser-déposer) ;
- `<ApplicationDetail … onStatusChange={(status) => changeStatusByMenu(detailApp.id, status)} …>`.

Laisser `<ApplicationsPage>` et `<KanbanPage>` de l'édition `full` sur `updateStatus` sans enveloppe : la mesure n'existe qu'en `lite`.

- [ ] **Étape 3 : marquer l'entrée dans un tableau — `useBoardAccess.ts`**

```ts
import { configureUsage, track } from '@/lib/usageClient'
import { supabase } from '@/lib/supabase'

export type BoardOpenVia = 'code' | 'shortcut' | 'created'

const enterBoard = useCallback(async (tokenHash: string, code?: string, via: BoardOpenVia = 'code'): Promise<string | null> => {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (error) return MESSAGES.network
  if (code && data.user) savedAccessCode.save(data.user.id, code)
  // WHY: la session existe dès que verifyOtp a résolu — on peut écrire tout de suite, sans
  // attendre l'effet de App, qui ne s'exécutera qu'au rendu suivant.
  configureUsage({ client: supabase })
  if (via === 'created') track('board_created')
  track('board_opened', { via })
  return null
}, [])
```

Et faire passer `via` par `openBoard` :

```ts
const openBoard = useCallback(async (input: string, via: BoardOpenVia = 'code'): Promise<string | null> => {
  const code = normalizeAccessCode(input)
  if (!isValidAccessCode(code)) return MESSAGES.invalidFormat
  const result = await callBoardFunction<{ tokenHash: string }>('board-open', 'open', { code })
  if ('error' in result) return result.error
  return enterBoard(result.data.tokenHash, code, via)
}, [enterBoard])
```

**Note :** une entrée par lien magique n'appelle pas `enterBoard` (supabase-js pose la session depuis l'adresse). Elle ne produit donc pas de `board_opened` — seulement le `session_started` de `App`. C'est l'écart n° 4 documenté en tête de plan.

- [ ] **Étape 4 : distinguer les trois entrées — `LiteAccessGate.tsx`**

`handleOpen` prend la provenance :

```tsx
const handleOpen = useCallback(async (code: string, via: BoardOpenVia = 'code') => {
  setBusy(true)
  setError(null)
  const err = await openBoard(code, via)
  if (err) {
    setError(err)
    setBusy(false)
  }
}, [openBoard])
```

L'effet du raccourci passe `'shortcut'` :

```tsx
void handleOpen(shortcutCode, 'shortcut')
```

Et `handleEnterCreated` passe `'created'` :

```tsx
const err = await enterBoard(tokenHash, code, 'created')
```

Ajouter `import type { BoardOpenVia } from '@/hooks/useBoardAccess'`.

- [ ] **Étape 5 : les trois dernières actions**

`src/pages/BoardPage.tsx` — dans `changeView` :

```tsx
function changeView(next: BoardView) {
  setView(next)
  saveBoardView(next)
  track('view_switched', { to: next })
}
```

`src/pages/MyBoardPage.tsx` — après le succès de `handleRotate` (juste avant `setRevealedCode(result.code)`) :

```tsx
track('code_rotated')
```

et dans `sendConfirmation`, après `setNewEmail('')` :

```tsx
track('email_secured')
```

`src/components/access/SavedCodePanel.tsx` — dans le bouton « Afficher / Masquer » :

```tsx
onClick={() => setVisible((current) => {
  if (!current) track('code_revealed')
  return !current
})}
```

Ajouter `import { track } from '@/lib/usageClient'` dans chacun des trois fichiers.

- [ ] **Étape 6 : vérifier en vrai**

```bash
npm test
npm run lint
npm run build:lite
```
Expected : les trois passent.

Puis, en local (`VITE_EDITION=lite npm run dev`), avec un **tableau de test créé pour l'occasion** : créer le tableau, ajouter une candidature, changer son statut au glisser-déposer, ouvrir son détail, basculer Colonnes/Liste, afficher le code, puis changer d'onglet et revenir. Enfin :

Run : `npm run grant:admin -- --list`
Expected : le tableau de test apparaît. Vérifier ensuite en base, avec la clé service, que les événements attendus sont bien là :

```bash
node -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const fs = await import('node:fs')
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const [k,...r]=line.split('='); if (k && r.length) process.env[k.trim()] ??= r.join('=').trim()
  }
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data } = await db.from('usage_events').select('name, source, props, occurred_at').order('occurred_at')
  console.table(data)
})"
```
Expected : `board_created`, `board_opened {via:'created'}`, `session_started`, `application_added`, `application_status_changed {via:'drag'}`, `application_opened`, `view_switched`, `code_revealed`, et un `session_ended` dont `clicks` est supérieur à zéro. **C'est aussi la vérification manuelle de `browserTargets()`** : si `clicks` vaut 0 ou si `session_ended` manque, les écouteurs ne sont pas posés.

Supprimer ensuite le tableau de test depuis « Mon tableau ».

- [ ] **Étape 7 : commit**

```bash
git add src/App.tsx src/hooks/useBoardAccess.ts src/components/access/LiteAccessGate.tsx src/components/access/SavedCodePanel.tsx src/pages/BoardPage.tsx src/pages/MyBoardPage.tsx
git commit -m "feat(usage): mesurer les actions du site"
```

---

### Tâche 6 : l'interrupteur de refus

**Fichiers :**
- Créer : `src/hooks/useUsagePreference.ts`
- Modifier : `src/pages/MyBoardPage.tsx`

**Interfaces :**
- Consomme : `setUsageOptedOut` de `src/lib/usageClient.ts`, `supabase` de `src/lib/supabase.ts`.
- Produit : `useUsagePreference() → { optedOut: boolean | null, busy: boolean, change(next: boolean): Promise<void> }`. `optedOut === null` signifie « lecture en cours ».

- [ ] **Étape 1 : écrire le hook**

Créer `src/hooks/useUsagePreference.ts` :

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setUsageOptedOut } from '@/lib/usageClient'

/** Refus de mesure d'usage, gardé dans usage_preferences et appliqué aussi par la règle RLS. */
export function useUsagePreference() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('usage_preferences').select('opted_out').maybeSingle()
      const value = data?.opted_out === true
      setOptedOut(value)
      setUsageOptedOut(value)
    })()
  }, [])

  const change = useCallback(async (next: boolean) => {
    setBusy(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setBusy(false); return }
    const { error } = await supabase
      .from('usage_preferences')
      .upsert({ user_id: data.user.id, opted_out: next, updated_at: new Date().toISOString() })
    setBusy(false)
    // WHY: en cas d'échec, on ne touche ni l'affichage ni le traceur — la case reste sur son
    // état réel en base plutôt que de mentir à l'utilisateur.
    if (error) return
    setOptedOut(next)
    setUsageOptedOut(next)
  }, [])

  return { optedOut, busy, change }
}
```

- [ ] **Étape 2 : ajouter la section à « Mon tableau »**

Dans `src/pages/MyBoardPage.tsx`, importer le hook :

```tsx
import { useUsagePreference } from '@/hooks/useUsagePreference'
```

L'appeler à côté des autres hooks :

```tsx
const { optedOut, busy: usageBusy, change: changeUsage } = useUsagePreference()
```

Puis insérer cette section **juste avant** « Quitter ce tableau » :

```tsx
<Section title="Mesure d'usage">
  <Help>
    Pour savoir si JobTracker sert à quelque chose, l'auteur mesure les actions que tu fais
    (ajouter une candidature, changer un statut, ouvrir un détail…) et un total de clics par visite.
    Jamais le contenu de tes candidatures, jamais le libellé des boutons, et rien n'est transmis à un tiers.
  </Help>
  <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--color-ink)]">
    <input
      type="checkbox"
      className="h-4 w-4 accent-[var(--color-primary)]"
      checked={optedOut === true}
      disabled={optedOut === null || usageBusy}
      onChange={(event) => void changeUsage(event.target.checked)}
    />
    Ne pas mesurer mon usage
  </label>
</Section>
```

- [ ] **Étape 3 : vérifier**

```bash
npm test && npm run lint && npm run build:lite
```
Expected : tout passe.

En local sur un tableau de test : cocher la case, recharger la page, vérifier qu'elle reste cochée. Puis relancer la requête de l'étape 6 de la tâche 5 et vérifier qu'**aucun nouvel événement** n'apparaît après le moment où la case a été cochée. Décocher, vérifier que les événements repartent. Supprimer le tableau de test.

- [ ] **Étape 4 : commit**

```bash
git add src/hooks/useUsagePreference.ts src/pages/MyBoardPage.tsx
git commit -m "feat(usage): interrupteur « ne pas mesurer mon usage »"
```

---

### Tâche 7 : le calcul des chiffres

**Fichiers :**
- Créer : `src/lib/adminStats.ts`
- Test : `src/lib/adminStats.test.ts`

**Interfaces :**
- Consomme : rien. Module pur — c'est là que vivent toutes les moyennes, médianes, parts et mises en forme, pour être testables sans base.
- Produit : les types `BoardRow`, `SessionRow`, `DayRow`, `Kpis`, `FunnelStep`, `WeekRow`, et les fonctions `mean`, `median`, `computeKpis`, `computeFunnel`, `toWeeks`, `weekStart`, `formatSince`, `formatDuration`, `formatShare`, `shortBoardId`, `relativeDays`. Les tâches 8 et 9 en dépendent. **Les noms de champs de `BoardRow`, `SessionRow` et `DayRow` reprennent exactement les colonnes renvoyées par les fonctions SQL de la tâche 2.**

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `src/lib/adminStats.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  computeFunnel, computeKpis, formatDuration, formatShare, formatSince, mean, median,
  relativeDays, shortBoardId, toWeeks, weekStart, type BoardRow, type DayRow, type SessionRow,
} from './adminStats'

const NOW = Date.parse('2026-09-20T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

function board(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    user_id: '11111111-2222-3333-4444-555555555555',
    created_at: daysAgo(40),
    last_seen_at: daysAgo(1),
    sessions: 3,
    clicks: 30,
    applications: 4,
    active_days: 3,
    returned_within_7d: true,
    has_extension: false,
    secured: false,
    ...overrides,
  }
}

describe('mean et median', () => {
  it('rendent 0 sur une liste vide', () => {
    expect(mean([])).toBe(0)
    expect(median([])).toBe(0)
  })

  it('calculent la moyenne arrondie au dixième', () => {
    expect(mean([1, 2, 4])).toBe(2.3)
  })

  it('prennent la valeur du milieu, ou la moyenne des deux valeurs centrales', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('computeKpis', () => {
  const sessions: SessionRow[] = [
    { user_id: 'a', clicks: 10, duration_s: 60, occurred_at: daysAgo(1) },
    { user_id: 'a', clicks: 20, duration_s: 120, occurred_at: daysAgo(2) },
    { user_id: 'b', clicks: 30, duration_s: 600, occurred_at: daysAgo(3) },
  ]

  it('compte les tableaux, ceux de la période, les actifs et les dormants', () => {
    const boards = [
      board({ created_at: daysAgo(3), last_seen_at: daysAgo(1) }),
      board({ created_at: daysAgo(60), last_seen_at: daysAgo(20) }),
      board({ created_at: daysAgo(90), last_seen_at: daysAgo(80) }),
    ]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.boardsTotal).toBe(3)
    expect(kpis.boardsCreatedInPeriod).toBe(1)
    expect(kpis.active7).toBe(1)
    expect(kpis.active30).toBe(2)
    expect(kpis.dormant).toBe(1)
  })

  it('donne moyenne ET médiane des candidatures, qu’un seul gros tableau ne doit pas écraser', () => {
    const boards = [board({ applications: 1 }), board({ applications: 2 }), board({ applications: 34 })]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.applicationsTotal).toBe(37)
    expect(kpis.applicationsMean).toBe(12.3)
    expect(kpis.applicationsMedian).toBe(2)
  })

  it('compte les tableaux ayant connecté l’extension et leur part', () => {
    const boards = [board({ has_extension: true }), board(), board(), board()]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.extensionBoards).toBe(1)
    expect(kpis.extensionShare).toBe(0.25)
  })

  it('résume les sessions : clics et durée', () => {
    const kpis = computeKpis([board({ sessions: 2 }), board({ sessions: 4 })], sessions, { now: NOW, days: 30, measurementStart: null })
    expect(kpis.clicksMean).toBe(20)
    expect(kpis.clicksMedian).toBe(20)
    expect(kpis.sessionSecondsMedian).toBe(120)
    expect(kpis.sessionsPerActiveBoardMean).toBe(3)
  })

  it('ne retient pour la rétention que les tableaux nés après le début de la mesure et vieux de 7 jours', () => {
    const boards = [
      board({ created_at: daysAgo(2), returned_within_7d: true }),   // trop jeune
      board({ created_at: daysAgo(40), returned_within_7d: true }),  // avant la mesure
      board({ created_at: daysAgo(20), returned_within_7d: true }),
      board({ created_at: daysAgo(15), returned_within_7d: false }),
    ]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: daysAgo(30) })
    expect(kpis.retention7).toEqual({ eligible: 2, returned: 1, share: 0.5 })
  })

  it('ne divise jamais par zéro', () => {
    const kpis = computeKpis([], [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis).toMatchObject({
      boardsTotal: 0, extensionShare: 0, applicationsMean: 0, clicksMedian: 0,
      sessionsPerActiveBoardMean: 0, retention7: { eligible: 0, returned: 0, share: 0 },
    })
  })
})

describe('computeFunnel', () => {
  it('rend quatre étapes décroissantes, en nombre et en part', () => {
    const boards = [
      board({ applications: 0, active_days: 1 }),
      board({ applications: 2, active_days: 1 }),
      board({ applications: 7, active_days: 3 }),
      board({ applications: 9, active_days: 5 }),
    ]
    expect(computeFunnel(boards)).toEqual([
      { label: 'Tableau créé', count: 4, share: 1 },
      { label: 'Au moins 1 candidature', count: 3, share: 0.75 },
      { label: 'Au moins 5 candidatures', count: 2, share: 0.5 },
      { label: 'Revenu un autre jour', count: 2, share: 0.5 },
    ])
  })

  it('rend des parts nulles sans aucun tableau', () => {
    expect(computeFunnel([])).toEqual([
      { label: 'Tableau créé', count: 0, share: 0 },
      { label: 'Au moins 1 candidature', count: 0, share: 0 },
      { label: 'Au moins 5 candidatures', count: 0, share: 0 },
      { label: 'Revenu un autre jour', count: 0, share: 0 },
    ])
  })
})

describe('toWeeks', () => {
  it('ramène chaque jour au lundi de sa semaine', () => {
    expect(weekStart('2026-09-20')).toBe('2026-09-14') // un dimanche
    expect(weekStart('2026-09-14')).toBe('2026-09-14') // un lundi
  })

  it('additionne les jours par semaine, du plus ancien au plus récent', () => {
    const days: DayRow[] = [
      { day: '2026-09-14', boards_created: 1, boards_active: 2, events: 10, clicks: 100 },
      { day: '2026-09-16', boards_created: 2, boards_active: 3, events: 5, clicks: 50 },
      { day: '2026-09-21', boards_created: 1, boards_active: 1, events: 7, clicks: 70 },
    ]
    expect(toWeeks(days)).toEqual([
      { start: '2026-09-14', boardsCreated: 3, events: 15, clicks: 150 },
      { start: '2026-09-21', boardsCreated: 1, events: 7, clicks: 70 },
    ])
  })
})

describe('mises en forme', () => {
  it('dit depuis quand la mesure existe', () => {
    expect(formatSince(null)).toBe('aucune mesure enregistrée pour l’instant')
    expect(formatSince('2026-09-20T08:00:00Z')).toBe('depuis le 20 septembre 2026')
  })

  it('écrit les durées en minutes et secondes', () => {
    expect(formatDuration(0)).toBe('0 s')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(125)).toBe('2 min 05 s')
  })

  it('écrit les parts en pourcentage entier', () => {
    expect(formatShare(0)).toBe('0 %')
    expect(formatShare(0.375)).toBe('38 %')
  })

  it('raccourcit l’identifiant d’un tableau', () => {
    expect(shortBoardId('11111111-2222-3333-4444-555555555555')).toBe('11111111')
  })

  it('dit à quand remonte la dernière utilisation', () => {
    expect(relativeDays(daysAgo(0), NOW)).toBe("aujourd’hui")
    expect(relativeDays(daysAgo(1), NOW)).toBe('hier')
    expect(relativeDays(daysAgo(5), NOW)).toBe('il y a 5 j')
    expect(relativeDays(daysAgo(70), NOW)).toBe('il y a 2 mois')
  })
})
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `npx vitest run src/lib/adminStats.test.ts`
Expected : ÉCHEC — `Failed to resolve import "./adminStats"`.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/adminStats.ts` :

```ts
/**
 * Calcul des chiffres du tableau de bord créateur. Module pur : les fonctions SQL renvoient des
 * lignes brutes, tout le reste (moyennes, médianes, parts, entonnoir, rétention) se calcule ici,
 * où c'est testable sans base.
 */

/** Une ligne de public.admin_boards(p_days). */
export interface BoardRow {
  user_id: string
  created_at: string
  last_seen_at: string
  sessions: number
  clicks: number
  applications: number
  active_days: number
  returned_within_7d: boolean
  has_extension: boolean
  secured: boolean
}

/** Une ligne de public.admin_sessions(p_days). */
export interface SessionRow {
  user_id: string
  clicks: number
  duration_s: number
  occurred_at: string
}

/** Une ligne de public.admin_timeseries(p_days). */
export interface DayRow {
  day: string
  boards_created: number
  boards_active: number
  events: number
  clicks: number
}

export interface Kpis {
  boardsTotal: number
  boardsCreatedInPeriod: number
  active7: number
  active30: number
  dormant: number
  extensionBoards: number
  extensionShare: number
  applicationsTotal: number
  applicationsMean: number
  applicationsMedian: number
  clicksMean: number
  clicksMedian: number
  sessionSecondsMedian: number
  sessionsPerActiveBoardMean: number
  retention7: { eligible: number; returned: number; share: number }
}

export interface FunnelStep {
  label: string
  count: number
  share: number
}

export interface WeekRow {
  start: string
  boardsCreated: number
  events: number
  clicks: number
}

const DAY_MS = 86_400_000

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole
}

export function computeKpis(
  boards: BoardRow[],
  sessions: SessionRow[],
  options: { now: number; days: number; measurementStart: string | null },
): Kpis {
  const { now, days, measurementStart } = options
  const since = now - days * DAY_MS
  const start = measurementStart === null ? null : Date.parse(measurementStart)

  const seenAfter = (row: BoardRow, cutoff: number) => Date.parse(row.last_seen_at) >= cutoff
  const createdBefore = (row: BoardRow, cutoff: number) => Date.parse(row.created_at) < cutoff

  // WHY: n'entrent dans la rétention que les tableaux nés APRÈS le début de la mesure — pour les
  // plus anciens, l'absence d'événement ne veut pas dire qu'ils ne sont pas revenus (spec §6).
  const eligible = start === null
    ? []
    : boards.filter((row) => Date.parse(row.created_at) >= start && createdBefore(row, now - 7 * DAY_MS))
  const returned = eligible.filter((row) => row.returned_within_7d)

  const withSessions = boards.filter((row) => row.sessions > 0)

  return {
    boardsTotal: boards.length,
    boardsCreatedInPeriod: boards.filter((row) => Date.parse(row.created_at) >= since).length,
    active7: boards.filter((row) => seenAfter(row, now - 7 * DAY_MS)).length,
    active30: boards.filter((row) => seenAfter(row, now - 30 * DAY_MS)).length,
    dormant: boards.filter((row) => createdBefore(row, now - 30 * DAY_MS) && !seenAfter(row, now - 30 * DAY_MS)).length,
    extensionBoards: boards.filter((row) => row.has_extension).length,
    extensionShare: share(boards.filter((row) => row.has_extension).length, boards.length),
    applicationsTotal: boards.reduce((total, row) => total + row.applications, 0),
    applicationsMean: mean(boards.map((row) => row.applications)),
    applicationsMedian: median(boards.map((row) => row.applications)),
    clicksMean: mean(sessions.map((row) => row.clicks)),
    clicksMedian: median(sessions.map((row) => row.clicks)),
    sessionSecondsMedian: median(sessions.map((row) => row.duration_s)),
    sessionsPerActiveBoardMean: mean(withSessions.map((row) => row.sessions)),
    retention7: { eligible: eligible.length, returned: returned.length, share: share(returned.length, eligible.length) },
  }
}

export function computeFunnel(boards: BoardRow[]): FunnelStep[] {
  const total = boards.length
  const steps: [string, (row: BoardRow) => boolean][] = [
    ['Tableau créé', () => true],
    ['Au moins 1 candidature', (row) => row.applications >= 1],
    ['Au moins 5 candidatures', (row) => row.applications >= 5],
    ['Revenu un autre jour', (row) => row.active_days >= 2],
  ]
  return steps.map(([label, matches]) => {
    const count = boards.filter(matches).length
    return { label, count, share: share(count, total) }
  })
}

/** Lundi de la semaine d'un jour « AAAA-MM-JJ », en UTC pour ne pas dépendre du fuseau. */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const weekday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - weekday)
  return date.toISOString().slice(0, 10)
}

export function toWeeks(days: DayRow[]): WeekRow[] {
  const weeks = new Map<string, WeekRow>()
  for (const day of days) {
    const start = weekStart(day.day)
    const week = weeks.get(start) ?? { start, boardsCreated: 0, events: 0, clicks: 0 }
    week.boardsCreated += day.boards_created
    week.events += day.events
    week.clicks += day.clicks
    weeks.set(start, week)
  }
  // WHY: boards_active n'est PAS additionné : un même tableau actif deux jours compterait deux
  // fois. Le nombre d'actifs exact reste dans les chiffres clés (actifs 7 j / 30 j).
  return [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start))
}

export function formatSince(measurementStart: string | null): string {
  if (measurementStart === null) return 'aucune mesure enregistrée pour l’instant'
  const date = new Date(measurementStart)
  return `depuis le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${String(Math.round(seconds % 60)).padStart(2, '0')} s`
}

export function formatShare(value: number): string {
  return `${Math.round(value * 100)} %`
}

export function shortBoardId(userId: string): string {
  return userId.slice(0, 8)
}

export function relativeDays(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY_MS)
  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  if (days < 60) return `il y a ${days} j`
  return `il y a ${Math.floor(days / 30)} mois`
}
```

- [ ] **Étape 4 : lancer les tests pour les voir passer**

Run : `npx vitest run src/lib/adminStats.test.ts`
Expected : 18 tests passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/adminStats.ts src/lib/adminStats.test.ts
git commit -m "feat(admin): calcul des chiffres clés, de l'entonnoir et des semaines"
```

---

### Tâche 8 : l'accès aux données et la route `/admin`

**Fichiers :**
- Créer : `src/lib/adminApi.ts`
- Créer : `src/hooks/useIsAdmin.ts`
- Modifier : `src/App.tsx`
- Modifier : `src/pages/MyBoardPage.tsx`

**Interfaces :**
- Consomme : `supabase` de `src/lib/supabase.ts` ; les types `BoardRow`, `SessionRow`, `DayRow` de `src/lib/adminStats.ts`.
- Produit :
  - `checkIsAdmin(): Promise<boolean>` (résultat mis en cache pour la durée de la session)
  - `fetchAdminData(days: number): Promise<AdminData | { error: string }>` avec `interface AdminData { meta: AdminMeta; boards: BoardRow[]; sessions: SessionRow[]; days: DayRow[] }` et `interface AdminMeta { measurement_start: string | null; boards_total: number; events_total: number; opted_out: number }`
  - `useIsAdmin(): boolean | null` (`null` tant que la réponse n'est pas connue)

  La tâche 9 consomme `fetchAdminData` et `AdminData`.

- [ ] **Étape 1 : écrire l'accès aux données**

Créer `src/lib/adminApi.ts` :

```ts
import { supabase } from './supabase'
import type { BoardRow, DayRow, SessionRow } from './adminStats'

export interface AdminMeta {
  measurement_start: string | null
  boards_total: number
  events_total: number
  opted_out: number
}

export interface AdminData {
  meta: AdminMeta
  boards: BoardRow[]
  sessions: SessionRow[]
  days: DayRow[]
}

// WHY: une seule question à la base par session. La réponse ne change pas en cours de visite,
// et elle est posée par App (pour la route) comme par MyBoardPage (pour le lien).
let adminCheck: Promise<boolean> | null = null

export function checkIsAdmin(): Promise<boolean> {
  adminCheck ??= supabase.rpc('is_admin').then(({ data, error }) => !error && data === true)
  return adminCheck
}

/** Pour les tests et après un changement de tableau. */
export function resetAdminCheck(): void {
  adminCheck = null
}

export async function fetchAdminData(days: number): Promise<AdminData | { error: string }> {
  const [meta, boards, sessions, series] = await Promise.all([
    supabase.rpc('admin_meta'),
    supabase.rpc('admin_boards', { p_days: days }),
    supabase.rpc('admin_sessions', { p_days: days }),
    // WHY: la courbe montre toujours au moins un trimestre, même quand les chiffres clés
    // portent sur 7 jours — sinon elle n'a que deux barres et ne dit rien.
    supabase.rpc('admin_timeseries', { p_days: Math.max(days, 90) }),
  ])

  if (meta.error || boards.error || sessions.error || series.error) {
    return { error: 'Impossible de charger le tableau de bord.' }
  }

  return {
    meta: meta.data as AdminMeta,
    boards: (boards.data ?? []) as BoardRow[],
    sessions: (sessions.data ?? []) as SessionRow[],
    days: (series.data ?? []) as DayRow[],
  }
}
```

- [ ] **Étape 2 : écrire le hook**

Créer `src/hooks/useIsAdmin.ts` :

```ts
import { useEffect, useState } from 'react'
import { checkIsAdmin } from '@/lib/adminApi'
import { FEATURES } from '@/config/edition'

/** `null` tant que la base n'a pas répondu, pour ne pas faire clignoter le lien ni la route. */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(FEATURES.accessCode ? null : false)

  useEffect(() => {
    if (!FEATURES.accessCode) return
    let alive = true
    void checkIsAdmin().then((value) => { if (alive) setIsAdmin(value) })
    return () => { alive = false }
  }, [])

  return isAdmin
}
```

- [ ] **Étape 3 : ajouter la route dans `App.tsx`**

Déclarer la page en chargement différé, à côté de `GoalsPage` et `LibraryPage` :

```tsx
// WHY: chargée à la demande — la page d'administration ne doit jamais entrer dans le paquet que
// téléchargent les utilisateurs ordinaires, qui n'y auront jamais accès.
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))
```

Appeler le hook avec les autres :

```tsx
const isAdmin = useIsAdmin()
```

et ajouter la route, juste avant la règle `*` :

```tsx
{FEATURES.accessCode && isAdmin && (
  <Route path="admin" element={<Suspense fallback={PAGE_FALLBACK}><AdminPage /></Suspense>} />
)}
```

Ajouter `import { useIsAdmin } from '@/hooks/useIsAdmin'`.

**Attention :** tant que `isAdmin` vaut `null`, la route n'existe pas et `/admin` tombe sur la règle `*` qui redirige vers `/`. Ouvrir `/admin` directement à froid renverrait donc au tableau. Pour l'éviter, garder l'affichage en attente tant que la réponse n'est pas connue :

```tsx
{FEATURES.accessCode && isAdmin !== false && (
  <Route
    path="admin"
    element={isAdmin === null ? PAGE_FALLBACK : <Suspense fallback={PAGE_FALLBACK}><AdminPage /></Suspense>}
  />
)}
```

- [ ] **Étape 4 : ajouter le lien dans « Mon tableau »**

Dans `src/pages/MyBoardPage.tsx`, importer `useIsAdmin` et `Link` (déjà importé), puis :

```tsx
const isAdmin = useIsAdmin()
```

et insérer cette section **tout en haut**, juste après `<Title>Mon tableau</Title>` :

```tsx
{isAdmin === true && (
  <Section title="Tableau de bord">
    <Help>Réservé à l'auteur&nbsp;: l'usage de tous les tableaux.</Help>
    <Link className={cn(SECONDARY_BUTTON_CLASS, 'no-underline')} to="/admin">
      <BarChart3 size={16} />
      Ouvrir le tableau de bord
    </Link>
  </Section>
)}
```

Ajouter `BarChart3` à l'import de `lucide-react` (vérifié : cette icône existe bien dans lucide-react 0.435).

- [ ] **Étape 5 : vérifier**

```bash
npm test && npm run lint && npm run build:lite
```
Expected : tout passe, **et** `check-lite-bundle.mjs` reste vert.

Vérifier aussi que la page est bien dans un fichier à part :

Run : `ls dist/assets | grep -i admin`
Expected : un fichier du type `AdminPage-XXXXXXXX.js`. S'il n'existe pas, le chargement différé n'a pas fonctionné.

- [ ] **Étape 6 : commit**

```bash
git add src/lib/adminApi.ts src/hooks/useIsAdmin.ts src/App.tsx src/pages/MyBoardPage.tsx
git commit -m "feat(admin): route /admin réservée à l'auteur et accès aux données"
```

---

### Tâche 9 : la page `/admin`

**Fichiers :**
- Créer : `src/pages/AdminPage.tsx`
- Créer : `src/components/admin/KpiGrid.tsx`
- Créer : `src/components/admin/WeeklyChart.tsx`
- Créer : `src/components/admin/BoardTable.tsx`
- Créer : `src/components/admin/FunnelBars.tsx`

**Interfaces :**
- Consomme : `fetchAdminData`, `AdminData` de `src/lib/adminApi.ts` ; `computeKpis`, `computeFunnel`, `toWeeks`, `formatSince`, `formatShare`, `formatDuration`, `shortBoardId`, `relativeDays`, `Kpis`, `FunnelStep`, `WeekRow`, `BoardRow` de `src/lib/adminStats.ts`.
- Produit : `AdminPage` (export nommé, attendu par le `lazy()` de la tâche 8).

**Avant d'écrire `WeeklyChart.tsx`, charger la compétence `dataviz`** : elle fixe les règles de forme, de couleur et d'étiquetage. Les couleurs doivent venir des variables CSS déjà définies (`--color-primary`, `--color-accent`, `--color-muted`, `--color-border`), pas d'une palette inventée.

- [ ] **Étape 1 : les chiffres clés**

Créer `src/components/admin/KpiGrid.tsx` :

```tsx
import { formatDuration, formatShare, type Kpis } from '@/lib/adminStats'

interface KpiGridProps {
  kpis: Kpis
  days: number
  since: string
}

interface Tile {
  label: string
  value: string
  hint?: string
}

function tilesFor(kpis: Kpis, days: number, since: string): Tile[] {
  return [
    { label: 'Tableaux', value: String(kpis.boardsTotal), hint: `dont ${kpis.boardsCreatedInPeriod} créé(s) sur ${days} j` },
    { label: 'Actifs 7 j', value: String(kpis.active7), hint: `${kpis.active30} sur 30 j` },
    { label: 'Dormants', value: String(kpis.dormant), hint: 'créés il y a plus de 30 j, inactifs depuis 30 j' },
    { label: 'Extension', value: String(kpis.extensionBoards), hint: `${formatShare(kpis.extensionShare)} des tableaux · ${since}` },
    { label: 'Candidatures', value: String(kpis.applicationsTotal), hint: `moyenne ${kpis.applicationsMean} · médiane ${kpis.applicationsMedian}` },
    { label: 'Clics par session', value: String(kpis.clicksMedian), hint: `médiane · moyenne ${kpis.clicksMean} · ${since}` },
    { label: 'Durée d’une session', value: formatDuration(kpis.sessionSecondsMedian), hint: `médiane · ${since}` },
    { label: 'Sessions par tableau', value: String(kpis.sessionsPerActiveBoardMean), hint: `moyenne sur les tableaux actifs · ${since}` },
    {
      label: 'Rétention 7 j',
      value: kpis.retention7.eligible === 0 ? '—' : formatShare(kpis.retention7.share),
      hint: kpis.retention7.eligible === 0
        ? 'aucun tableau assez ancien depuis le début de la mesure'
        : `${kpis.retention7.returned} sur ${kpis.retention7.eligible} tableaux`,
    },
  ]
}

export function KpiGrid({ kpis, days, since }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {tilesFor(kpis, days, since).map((tile) => (
        <div key={tile.label} className="card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{tile.label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-[var(--color-primary)]">{tile.value}</p>
          {/* WHY: l'effectif est toujours affiché à côté d'un pourcentage — sur quelques dizaines
              de tableaux, « 38 % » sans « 3 sur 8 » donne une fausse impression de précision. */}
          {tile.hint && <p className="mt-1.5 text-[12px] leading-snug text-[var(--color-muted)]">{tile.hint}</p>}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Étape 2 : la courbe**

Créer `src/components/admin/WeeklyChart.tsx` :

```tsx
import type { WeekRow } from '@/lib/adminStats'

interface WeeklyChartProps {
  weeks: WeekRow[]
  metric: 'boardsCreated' | 'events' | 'clicks'
  title: string
}

const WIDTH = 640
const HEIGHT = 150
const PAD_TOP = 10
const PAD_BOTTOM = 24

function labelFor(start: string): string {
  return new Date(`${start}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function WeeklyChart({ weeks, metric, title }: WeeklyChartProps) {
  const values = weeks.map((week) => week[metric])
  const max = Math.max(1, ...values)
  const plot = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = weeks.length === 0 ? WIDTH : WIDTH / weeks.length
  const barWidth = Math.max(2, slot * 0.6)
  // WHY: une étiquette toutes les n semaines, sinon elles se chevauchent au-delà d'un trimestre.
  const labelEvery = Math.ceil(weeks.length / 8)

  return (
    <div className="card p-4">
      <p className="mb-3 text-[13px] font-semibold text-[var(--color-ink)]">{title}</p>
      {weeks.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted)]">Rien à afficher pour l’instant.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={title}>
          <line x1={0} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH} y2={HEIGHT - PAD_BOTTOM} stroke="var(--color-border)" strokeWidth={1} />
          {weeks.map((week, index) => {
            const value = week[metric]
            const height = (value / max) * plot
            const x = index * slot + (slot - barWidth) / 2
            return (
              <g key={week.start}>
                <rect
                  x={x}
                  y={HEIGHT - PAD_BOTTOM - height}
                  width={barWidth}
                  height={height}
                  rx={2}
                  fill="var(--color-primary)"
                >
                  <title>{`Semaine du ${labelFor(week.start)} : ${value}`}</title>
                </rect>
                {index % labelEvery === 0 && (
                  <text
                    x={index * slot + slot / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-muted)"
                  >
                    {labelFor(week.start)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
```

- [ ] **Étape 3 : le tableau par tableau**

Créer `src/components/admin/BoardTable.tsx` :

```tsx
import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { relativeDays, shortBoardId, type BoardRow } from '@/lib/adminStats'
import { cn } from '@/lib/utils'

type SortKey = 'last_seen_at' | 'created_at' | 'applications' | 'sessions' | 'clicks'

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: null, label: 'Tableau' },
  { key: 'created_at', label: 'Créé le' },
  { key: 'last_seen_at', label: 'Dernière utilisation' },
  { key: 'sessions', label: 'Sessions', numeric: true },
  { key: 'clicks', label: 'Clics', numeric: true },
  { key: 'applications', label: 'Candidatures', numeric: true },
  { key: null, label: 'Extension' },
  { key: null, label: 'Email' },
]

function compare(a: BoardRow, b: BoardRow, key: SortKey): number {
  if (key === 'last_seen_at' || key === 'created_at') return Date.parse(b[key]) - Date.parse(a[key])
  return b[key] - a[key]
}

export function BoardTable({ boards, now }: { boards: BoardRow[]; now: number }) {
  const [sortKey, setSortKey] = useState<SortKey>('last_seen_at')
  const sorted = [...boards].sort((a, b) => compare(a, b, sortKey))

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                className={cn('px-3 py-2.5 font-semibold text-[var(--color-muted)]', column.numeric ? 'text-right' : 'text-left')}
              >
                {column.key ? (
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key!)}
                    aria-pressed={sortKey === column.key}
                    className={cn('inline-flex items-center gap-1', sortKey === column.key && 'text-[var(--color-primary)]')}
                  >
                    {column.label}
                    <ArrowUpDown size={12} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((board) => (
            <tr key={board.user_id} className="border-b border-[var(--color-border)] last:border-0">
              {/* WHY: jamais l'email ni le code — seulement un identifiant court, qui suffit à
                  reconnaître une ligne d'une visite à l'autre. */}
              <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--color-ink)]">{shortBoardId(board.user_id)}</td>
              <td className="px-3 py-2.5 text-[var(--color-muted)]">{board.created_at.slice(0, 10)}</td>
              <td className="px-3 py-2.5 text-[var(--color-ink)]">{relativeDays(board.last_seen_at, now)}</td>
              <td className="px-3 py-2.5 text-right">{board.sessions || '—'}</td>
              <td className="px-3 py-2.5 text-right">{board.clicks || '—'}</td>
              <td className="px-3 py-2.5 text-right">{board.applications}</td>
              <td className="px-3 py-2.5">{board.has_extension ? 'oui' : '—'}</td>
              <td className="px-3 py-2.5">{board.secured ? 'sécurisé' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="px-3 py-6 text-center text-[var(--color-muted)]">Aucun tableau.</p>}
    </div>
  )
}
```

- [ ] **Étape 4 : l'entonnoir**

Créer `src/components/admin/FunnelBars.tsx` :

```tsx
import { formatShare, type FunnelStep } from '@/lib/adminStats'

export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="text-[var(--color-ink)]">{step.label}</span>
            <span className="text-[var(--color-muted)]">
              {step.count} · {formatShare(step.share)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${Math.round(step.share * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Étape 5 : assembler la page**

Créer `src/pages/AdminPage.tsx` :

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchAdminData, type AdminData } from '@/lib/adminApi'
import { computeFunnel, computeKpis, formatSince, toWeeks } from '@/lib/adminStats'
import { BoardTable } from '@/components/admin/BoardTable'
import { FunnelBars } from '@/components/admin/FunnelBars'
import { KpiGrid } from '@/components/admin/KpiGrid'
import { WeeklyChart } from '@/components/admin/WeeklyChart'
import { cn } from '@/lib/utils'

const PERIODS = [7, 30, 90] as const

export function AdminPage() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // WHY: figé au chargement des données, pour que « il y a 3 j » ne bouge pas entre deux rendus.
  // Un useMemo sur [data] ferait échouer npm run lint (--max-warnings 0) : exhaustive-deps y voit
  // une dépendance inutile, puisque Date.now() ne lit pas data.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    void fetchAdminData(days).then((result) => {
      if (!alive) return
      if ('error' in result) setError(result.error)
      else { setData(result); setNow(Date.now()) }
    })
    return () => { alive = false }
  }, [days])
  const since = data ? formatSince(data.meta.measurement_start) : ''
  const kpis = useMemo(
    () => (data ? computeKpis(data.boards, data.sessions, { now, days, measurementStart: data.meta.measurement_start }) : null),
    [data, days, now],
  )
  const weeks = useMemo(() => (data ? toWeeks(data.days) : []), [data])
  const funnel = useMemo(() => (data ? computeFunnel(data.boards) : []), [data])

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <Link to="/mon-tableau" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-accent)] no-underline hover:underline">
        <ArrowLeft size={15} />
        Retour aux réglages
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-primary)]">Tableau de bord</h1>
          {data && <p className="text-[13px] text-[var(--color-muted)]">Mesure d’usage {since}.</p>}
        </div>
        <div role="group" aria-label="Période" className="flex items-center gap-1 rounded-full bg-[var(--color-bg)] p-1" style={{ border: '1px solid var(--color-border)' }}>
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={cn('rounded-full px-3 py-1.5 text-[13px] font-medium', days === period ? 'text-white' : 'text-[var(--color-muted)]')}
              style={days === period ? { background: 'var(--color-primary)' } : undefined}
            >
              {period} j
            </button>
          ))}
        </div>
      </div>

      {error && <p className="card p-4 text-[14px] text-[var(--color-danger)]">{error}</p>}
      {!error && !data && <p className="text-[14px] text-[var(--color-muted)]">Chargement…</p>}

      {data && kpis && (
        <>
          <KpiGrid kpis={kpis} days={days} since={since} />

          {/* WHY: deux graphiques séparés plutôt qu'un seul à deux séries — « tableaux créés » et
              « événements » n'ont pas du tout la même échelle, les superposer écraserait le premier. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeeklyChart weeks={weeks} metric="boardsCreated" title="Tableaux créés par semaine" />
            <WeeklyChart weeks={weeks} metric="events" title="Actions par semaine" />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold text-[var(--color-primary)]">Par tableau</h2>
            <p className="mb-3 text-[13px] text-[var(--color-muted)]">
              Sessions et clics portent sur {days} jours et n’existent que {since} ; les candidatures et la
              dernière utilisation remontent avant la mesure.
            </p>
            <BoardTable boards={data.boards} now={now} />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold text-[var(--color-primary)]">Entonnoir</h2>
            <FunnelBars steps={funnel} />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Étape 6 : vérifier**

```bash
npm test && npm run lint && npm run build:lite
```
Expected : tout passe.

Puis, avec le tableau de l'auteur (inscrit dans `admin_users` à la tâche 2), ouvrir `/admin` sur `VITE_EDITION=lite npm run dev` et vérifier :
- les neuf tuiles s'affichent, sans `NaN` ni `Infinity` ;
- la ligne du tableau de l'auteur montre ses candidatures ;
- basculer 7 / 30 / 90 j recharge les chiffres ;
- ouvrir `/admin` depuis un **autre** tableau (le tableau de test) renvoie bien au tableau de candidatures.

Prendre une capture de la page et la montrer à l'utilisateur.

- [ ] **Étape 7 : commit**

```bash
git add src/pages/AdminPage.tsx src/components/admin/
git commit -m "feat(admin): page du tableau de bord créateur"
```

---

### Tâche 10 : confidentialité, documentation et vérification d'ensemble

**Fichiers :**
- Modifier : `src/pages/legal/PrivacyPage.tsx`
- Modifier : `CLAUDE.md`

**Interfaces :**
- Consomme : rien de nouveau.
- Produit : rien que d'autres tâches consomment.

- [ ] **Étape 1 : ajouter la mesure à la politique de confidentialité**

Dans `src/pages/legal/PrivacyPage.tsx`, section `donnees`, ajouter ce `<DataItem>` **après** celui des « Journaux techniques » :

```tsx
<DataItem
  title="Mesure d'usage"
  why="Savoir si JobTracker sert, et à quoi, pour décider quoi améliorer."
  basis="Intérêt légitime : connaître l'usage de son propre service. Tu peux t'y opposer à tout moment."
  duration="13 mois, puis effacement automatique."
>
  Une liste fermée d'actions&nbsp;: ouvrir ton tableau, ajouter, modifier, ouvrir ou supprimer une
  candidature, changer un statut, basculer l'affichage, afficher ou régénérer ton code, sécuriser
  ton email, et l'ajout d'une offre depuis l'extension. S'y ajoute, à chaque visite, la durée et un
  <strong> simple total de clics</strong>&nbsp;: ni le libellé des boutons, ni leur position, ni le
  contenu de tes candidatures. Ces mesures sont rattachées à l'identifiant technique de ton tableau,
  restent hébergées chez Supabase avec le reste, ne sont transmises à personne et ne servent à aucune
  publicité. Pour t'y soustraire&nbsp;: «&nbsp;Ne pas mesurer mon usage&nbsp;» dans Réglages →
  Mon tableau. Le refus est appliqué par la base de données elle-même.
</DataItem>
```

- [ ] **Étape 2 : documenter dans `CLAUDE.md`**

Ajouter une section, au même niveau que les autres sections d'architecture :

```markdown
## 📊 Mesure d'usage et tableau de bord créateur (édition `lite`)

Voir `docs/superpowers/specs/2026-09-20-admin-dashboard-design.md`.

- `usage_events` : dictionnaire **fermé** d'actions (contrainte `check` en base). Ajouter un nom
  demande une migration **et** une entrée dans `USAGE_EVENT_NAMES` (`src/lib/usage.ts`).
- Le client n'envoie jamais `user_id` : la colonne vaut `auth.uid()` par défaut, et la règle RLS le
  revérifie. Elle refuse aussi l'écriture si le tableau a coché « Ne pas mesurer mon usage ».
- `src/lib/usage.ts` est **pur** (ni React, ni Supabase, ni DOM) pour que l'extension le réutilise ;
  toute la glu navigateur est dans `src/lib/usageClient.ts`, derrière `SessionTargets`.
- Une **session** = une période où l'onglet est au premier plan, pas un chargement de page.
- `/admin` n'existe que pour les identifiants inscrits dans `admin_users`
  (`npm run grant:admin -- --list`), et la page est chargée à la demande : elle n'entre jamais dans
  le paquet des utilisateurs ordinaires.
- Les fonctions SQL rendent des **lignes brutes** ; moyennes, médianes, entonnoir et rétention sont
  calculés dans `src/lib/adminStats.ts`, testé avec vitest.
- Sessions et clics n'existent **qu'à partir du déploiement** : les colonnes correspondantes sont
  vides pour tout ce qui précède, et la page l'affiche.
- Vérification de bout en bout : `npm run verify:usage` (crée un tableau de test, puis le supprime).
```

- [ ] **Étape 3 : vérification d'ensemble**

```bash
npm test
npm run lint
npm run build:lite
npm run build:full
npm run verify:usage
```
Expected : les cinq commandes passent. `build:full` est important : il prouve que l'édition personnelle n'est pas cassée par des imports qui n'existent qu'en `lite`.

- [ ] **Étape 4 : relire les changements**

Lancer `/code-review high` sur la branche, et traiter les retours avant de proposer la fusion.

- [ ] **Étape 5 : commit**

```bash
git add src/pages/legal/PrivacyPage.tsx CLAUDE.md
git commit -m "docs: mesure d'usage dans la confidentialité et CLAUDE.md"
```

---

### Tâche 11 : l'extension — à appliquer sur `feature/chrome-extension`

**Ne fait PAS partie de la branche `feature/admin-dashboard`.** Vérifié : le dossier `extension/` n'existe pas sur `feature/lite-edition`, il vit sur `feature/chrome-extension` (commit `7e2b978`), non fusionnée. Cette tâche s'exécute donc **après** que l'une des deux branches a rejoint l'autre. Tant qu'elle n'est pas faite, la tuile « Extension » du tableau de bord affiche 0 — c'est normal, pas un défaut.

**Fichiers :**
- Modifier : `extension/src/session.ts`
- Modifier : `extension/src/Popup.tsx`
- Modifier : `extension/src/addDraft.ts`

**Interfaces :**
- Consomme : `configureUsage`, `track` de `src/lib/usageClient.ts` (l'extension importe déjà `src/lib` — voir `vite.extension.config.ts`).
- Produit : les événements de source `extension`, qui alimentent la colonne « Extension » et la tuile du même nom.

- [ ] **Étape 1 : marquer la connexion**

Dans `extension/src/session.ts`, à la fin de `openBoardWithCode`, après le succès de `verifyOtp` :

```ts
const { error: verifyError } = await client.auth.verifyOtp({ token_hash: data.tokenHash, type: 'magiclink' })
if (verifyError) return { ok: false, message: MESSAGES.network }
configureUsage({ client, source: 'extension' })
track('extension_connected')
return { ok: true }
```

Et dans `resolveSessionState`, quand l'état est `connected`, configurer aussi la mesure (le code n'est pas retapé à chaque ouverture) :

```ts
if (data.session) {
  configureUsage({ client, source: 'extension' })
  return { kind: 'connected', userId: data.session.user.id }
}
```

Ajouter `import { configureUsage, track } from '@/lib/usageClient'`.

- [ ] **Étape 2 : marquer l'ouverture et l'ajout**

Dans `extension/src/Popup.tsx`, quand l'état résolu est `connected`, à l'ouverture de la fenêtre :

```ts
track('extension_opened')
```

Dans le chemin d'ajout réussi d'une offre :

```ts
track('extension_application_added')
```

et sur le chemin où un doublon bloque l'ajout :

```ts
track('extension_duplicate_blocked')
```

**Avant d'écrire ces trois appels, relire `extension/src/Popup.tsx` et `extension/src/addDraft.ts`** pour poser chaque appel après le succès réel, jamais avant — même règle que sur le site : on mesure ce qui a abouti.

- [ ] **Étape 3 : vider la file avant la fermeture de la fenêtre**

La fenêtre d'une extension se ferme sans `visibilitychange` fiable. Ne pas appeler `startUsageSession` (les sessions n'ont pas de sens ici) ; appeler `flush` explicitement. Ajouter dans `extension/src/usageFlush.ts` :

```ts
import { flushUsage } from '@/lib/usageClient'

/** WHY: la fenêtre d'une extension disparaît sans prévenir ; on vide la file à chaque fermeture. */
export function flushOnUnload(target: Window): () => void {
  const handler = () => { void flushUsage() }
  target.addEventListener('pagehide', handler)
  return () => target.removeEventListener('pagehide', handler)
}
```

`flushUsage` est déjà exporté par `src/lib/usageClient.ts` (tâche 4). Il ne reste qu'à appeler cette aide depuis `Popup.tsx` au montage : `useEffect(() => flushOnUnload(window), [])`.

- [ ] **Étape 4 : vérifier**

```bash
npm test && npm run build:extension
```
Expected : les deux passent.

Puis, avec la copie visible `~/JobTracker-Extension` rechargée dans Chrome et un tableau de test : entrer le code, ouvrir la fenêtre, ajouter une offre, retenter la même offre (doublon). Vérifier en base que les quatre événements sont là avec `source = 'extension'`, puis supprimer le tableau de test.

- [ ] **Étape 5 : commit**

```bash
git add extension/src/session.ts extension/src/Popup.tsx extension/src/usageFlush.ts src/lib/usageClient.ts
git commit -m "feat(extension): mesurer la connexion et les ajouts depuis l'extension"
```

---

## Ordre d'exécution et dépendances

Les tâches 1 → 10 s'enchaînent dans l'ordre : chacune s'appuie sur les interfaces produites par les précédentes. Deux points d'attention :

- **La tâche 2 se termine par une question à l'utilisateur** (quel tableau est le sien). Ne pas deviner.
- **La tâche 11 vit sur une autre branche** et se fait après fusion. Elle n'est pas un prérequis des tâches 1 à 10.

Trois tâches demandent une vérification manuelle dans le navigateur (5, 6 et 9) et créent pour cela un tableau de test, **supprimé à la fin de chaque vérification**.
