# Tableau de bord créateur — mesure d'usage et page `/admin`

- **Date** : 2026-09-20
- **Statut** : design validé par l'utilisateur ; spec en relecture
- **Branche** : `feature/admin-dashboard` (depuis `feature/lite-edition` @ `a374aa9`)
- **Dépend de** : `docs/superpowers/specs/2026-09-13-lite-access-code-design.md` (tableaux, `board_access`), `docs/superpowers/specs/2026-09-14-chrome-extension-design.md` (extension, branche `feature/chrome-extension`)

## 1. Contexte et objectif

JobTracker en édition `lite` est public depuis peu, et son auteur n'a **aucune visibilité sur l'usage réel** : le projet ne contient aujourd'hui aucune mesure d'audience — ni Plausible, ni PostHog, ni table d'événements, ni compteur. Les seules traces sont des effets de bord du fonctionnement : `board_access.created_at`, `board_access.last_opened_at` (écrit uniquement à l'ouverture par code, `supabase/functions/_shared/supabaseDeps.ts:82`) et les dates des candidatures.

L'objectif est de répondre, dans une page réservée à l'auteur, à des questions comme : combien de tableaux existent, lesquels servent encore, combien de candidatures par tableau, combien de clics par session, et combien de personnes ont connecté l'extension Chrome.

L'édition `full` (usage personnel de l'auteur) n'est pas concernée : la mesure et la page `/admin` n'existent qu'en `lite`.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Périmètre | Instrumentation **et** tableau de bord dans un seul chantier |
| Emplacement | Page `/admin` dans l'application en ligne (pas d'outil local) |
| Nature de la mesure | Dictionnaire fermé d'actions nommées, **plus** un total de clics envoyé une fois par session |
| Approche technique | Tout en SQL : insertion directe protégée par RLS, agrégation par fonctions `security definer` |
| Accès à `/admin` | Liste blanche `admin_users` ; l'auteur ouvre son propre tableau avec son code |
| Confidentialité | Pas de bandeau ; paragraphe dans la page Confidentialité, interrupteur de refus dans « Mon tableau », purge à 13 mois |
| Édition | `lite` uniquement (`FEATURES.accessCode`) |

Approches écartées :
- **Deux edge functions** (`usage-track` + `admin-stats`) : cohérent avec les fonctions `board-*`, mais la garantie d'identité qu'elles apporteraient est déjà donnée par la règle RLS `user_id = auth.uid()`. Restait la limitation de débit, qui ne protège ici de rien d'important — un utilisateur ne peut fausser que sa propre ligne. Coût : deux déploiements de plus et une latence d'appel à froid sur chaque envoi.
- **Compteurs pré-agrégés seuls** (`board_usage_daily`) : table minuscule et requêtes instantanées, mais fige aujourd'hui les questions posables demain.
- **Enregistrer chaque clic avec son libellé** : volume et bruit disproportionnés à l'échelle du projet, et politique de confidentialité nettement plus lourde à justifier.
- **Outil d'administration local** lisant la base avec la clé `service_role` : le plus sûr, mais consultable depuis le seul Mac de l'auteur.

## 3. Ce qu'on mesure

### 3.1 Dictionnaire d'actions

La collecte est **fermée** : seuls les noms ci-dessous sont acceptés, il n'y a pas de capture opportuniste. Le nom est validé côté client (union TypeScript) et côté base (contrainte `check`).

Site (`source = 'web'`) :

| Nom | Déclencheur | `props` |
|---|---|---|
| `board_created` | tableau créé (`BoardCreatedScreen` affiché) | — |
| `board_opened` | entrée réussie par code | `{ via: 'code' \| 'shortcut' \| 'magic_link' }` |
| `session_started` | montage de l'application avec une session | — |
| `session_ended` | onglet masqué / déchargé | `{ clicks: number, duration_s: number }` |
| `application_added` | candidature enregistrée | `{ status }` |
| `application_status_changed` | changement de statut (glisser-déposer ou menu) | `{ from, to, via: 'drag' \| 'menu' }` |
| `application_opened` | ouverture du détail | — |
| `application_edited` | modification enregistrée | — |
| `application_deleted` | suppression confirmée | — |
| `follow_up_marked` | bouton « Relancer » | — |
| `view_switched` | bascule Colonnes / Liste | `{ to: 'columns' \| 'list' }` |
| `code_revealed` | code affiché dans « Mon tableau » | — |
| `code_rotated` | nouveau code généré | — |
| `email_secured` | demande de sécurisation par email envoyée | — |
| `board_deleted` | suppression du tableau confirmée | — |

Extension (`source = 'extension'`) :

| Nom | Déclencheur | `props` |
|---|---|---|
| `extension_connected` | `openBoardWithCode` réussit (`extension/src/session.ts`) | — |
| `extension_opened` | ouverture de la fenêtre de l'extension avec une session | — |
| `extension_application_added` | offre ajoutée au tableau depuis l'extension | — |
| `extension_duplicate_blocked` | ajout refusé, offre déjà présente | — |

### 3.2 Le compteur de clics

Un écouteur `click` en phase de capture sur `document` **incrémente un entier et rien d'autre** : ni libellé, ni identifiant d'élément, ni position. Ce total part dans `session_ended` avec la durée de session. On obtient donc « clics par session » sans conserver la moindre trace individuelle de clic.

## 4. Architecture

### 4.1 Base de données — migration `supabase/migrations/20260920000000_usage_events.sql`

```sql
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'web' check (source in ('web', 'extension')),
  props jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index usage_events_user_time_idx on public.usage_events (user_id, occurred_at desc);
create index usage_events_time_idx on public.usage_events (occurred_at desc);
create index usage_events_name_time_idx on public.usage_events (name, occurred_at desc);
```

Le nom est contraint en base par un `check` reprenant exactement la liste du §3.1 : un nom inconnu est rejeté, la table ne peut pas dériver.

`usage_preferences` porte le refus, et c'est la seule des trois tables que son propriétaire lit et écrit :

```sql
create table public.usage_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_out boolean not null default false,
  updated_at timestamptz not null default now()
);
```

`admin_users` (clé primaire `user_id`, RLS activée **sans aucune policy**, comme `board_access`) n'est lue que par les fonctions `security definer`.

### 4.2 Règles d'accès

`usage_events` — **aucune règle de lecture** : personne ne lit la table directement, ni un utilisateur, ni l'auteur. L'écriture est autorisée par :

```sql
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
```

Trois garanties, portées par la base et non par la confiance envers le client : on n'écrit que pour son propre tableau, on n'antidate pas, et **le refus de mesure est appliqué à l'insertion**. Un client modifié qui ignorerait l'interrupteur se ferait refuser ses écritures.

`usage_preferences` — lecture et écriture réservées à `user_id = auth.uid()`.

### 4.3 Fonctions d'agrégation (`security definer`)

Toutes **sauf `is_admin()`** commencent par `if not exists (select 1 from public.admin_users where user_id = auth.uid()) then raise exception 'forbidden'; end if;`. `is_admin()` répond au contraire à tout utilisateur connecté, par `true` ou `false` — c'est elle qui décide si la route existe, elle ne peut donc pas lever d'erreur. Toutes sont `revoke`'d de `public` et `anon`, `grant`'d à `authenticated` seulement.

| Fonction | Renvoie |
|---|---|
| `public.is_admin()` | `boolean` — appelable par tout utilisateur connecté, sert à décider si la route `/admin` existe |
| `public.admin_kpis(p_days integer default 30)` | une ligne de chiffres clés (§5.1) |
| `public.admin_boards(p_days integer default 30)` | une ligne par tableau (§5.2) |
| `public.admin_timeseries(p_days integer default 90)` | une ligne par jour (§5.3) |
| `public.admin_funnel()` | une ligne par étape d'entonnoir (§5.4) |

`admin_kpis` exécute au passage la purge `delete from public.usage_events where occurred_at < now() - interval '13 months';` — même procédé que `hit_rate_limit`, qui nettoie déjà `access_attempts` à chaque appel (`supabase/migrations/20260913120000_board_access.sql`). Pas de `pg_cron` à activer.

Aucune modification de `delete_board_data` : la suppression d'un tableau efface déjà ses événements et sa préférence par cascade depuis `auth.users`, exactement comme `cv_documents` et `ats_analyses`.

### 4.4 Envoi côté client — `src/lib/usage.ts`

Un point d'entrée unique, `track(name, props?)`, et un module sans dépendance sur React pour que l'extension l'importe tel quel.

- **Mise en file** en mémoire, **envoi par lots** : toutes les 10 s, ou dès 20 événements en attente, ou quand l'onglet passe en `hidden`.
- **Plafond de sécurité** : 500 événements par session ; au-delà, on cesse d'enregistrer (protège d'une boucle de code accidentelle, pas d'un abus).
- **Échec silencieux** : une erreur réseau est abandonnée sans nouvelle tentative et sans jamais remonter à l'interface. La mesure ne doit ni ralentir, ni bloquer, ni faire échouer une action.
- **Refus** : si l'utilisateur a coché le refus, `track` ne met rien en file et n'émet aucune requête. L'état est lu une fois au démarrage depuis `usage_preferences` et gardé en mémoire.
- **Client et source** : le module ne crée aucun client Supabase, il en reçoit un. Le site appelle `configureUsage({ client: supabase, source: 'web' })`, l'extension `configureUsage({ client, source: 'extension' })` avec le sien — c'est la seule différence entre les deux usages.
- **Édition** : sans appel à `configureUsage`, `track` ne fait rien. L'édition `full` ne l'appelle jamais (l'appel est fait derrière `FEATURES.accessCode`, le drapeau qui marque déjà `lite` dans `App.tsx`), la table n'est donc jamais touchée.

Le compteur de clics vit dans le même module : `startClickCounter()` pose l'écouteur de capture et `session_ended` le consomme.

### 4.5 Page `/admin` — `src/pages/AdminPage.tsx`

Au démarrage, `App` appelle `is_admin()` une fois par session et n'ajoute la route que si la réponse est vraie ; sinon `/admin` retombe sur `/` par la règle `*` déjà en place. Un lien vers `/admin` apparaît dans « Mon tableau » pour l'auteur uniquement — la page n'est jamais annoncée aux autres.

Quatre blocs, dans cet ordre : chiffres clés, courbe, tableau par tableau, entonnoir. Un sélecteur de période (7 / 30 / 90 jours) en tête pilote `admin_kpis` et `admin_timeseries`.

## 5. Contenu du tableau de bord

### 5.1 Chiffres clés — `admin_kpis(p_days)`

| Chiffre | Définition |
|---|---|
| Tableaux créés | `count(*)` sur `board_access` ; et créés sur la période |
| Tableaux actifs 7 j / 30 j | tableaux ayant au moins un événement dans la fenêtre |
| Tableaux dormants | créés il y a plus de 30 j, aucun événement depuis 30 j |
| Extension connectée | tableaux distincts ayant au moins un `extension_connected`, et part des tableaux |
| Candidatures | total, **moyenne et médiane** par tableau |
| Clics par session | moyenne et médiane de `session_ended.props->>'clicks'` sur la période |
| Durée de session | médiane de `duration_s` sur la période |
| Sessions par tableau | moyenne de `session_started` par tableau actif sur la période |
| Rétention J7 | parmi les tableaux créés il y a ≥ 7 j **après la mise en service de la mesure**, part ayant eu au moins un événement un jour calendaire différent de leur jour de création, dans les 7 j suivant la création |

La moyenne **et** la médiane sont affichées pour les candidatures et les clics : à cette échelle, un seul tableau très fourni (les 34 candidatures importées) déforme complètement une moyenne seule.

### 5.2 Tableau par tableau — `admin_boards(p_days)`

Une ligne par tableau, triable, par défaut du plus récemment utilisé au plus ancien.

| Colonne | Source |
|---|---|
| Tableau | 8 premiers caractères de `user_id` (jamais l'email, jamais le code) |
| Créé le | `board_access.created_at` |
| Dernière utilisation | le plus récent de `board_access.last_opened_at`, `max(usage_events.occurred_at)` et `max(Application."updatedAt")` |
| Sessions | `count` des `session_started` sur la période choisie en tête de page |
| Clics | somme des `clicks` de `session_ended` sur la même période |
| Candidatures | `count(*)` sur `Application` où `"userId" = user_id::text` |
| Extension | a au moins un `extension_connected` |
| Email | `auth.users.email not like 'board-%'` — un tableau « sécurisé » porte un vrai email (cf. `boardEmailFor`, `boardHandlers.ts:54`) |

L'adresse email elle-même n'est jamais renvoyée, seulement le fait qu'elle soit personnelle ou générée.

### 5.3 Courbe — `admin_timeseries(p_days)`

Une ligne par jour : tableaux créés, tableaux actifs, événements, clics. Affichée agrégée **par semaine** pour rester lisible au-delà d'un mois.

### 5.4 Entonnoir — `admin_funnel()`

Quatre étapes, en nombre et en part du départ : tableau créé → au moins 1 candidature → au moins 5 candidatures → revenu un autre jour que celui de la création.

## 6. Ce que le passé ne dira pas

Les tableaux existants n'ont aucun événement. Le tableau de bord croise donc trois sources d'âges différents :

- `board_access` — création et dernière ouverture par code : **valable depuis toujours** ;
- `Application` — activité passée par les dates de candidatures : **valable depuis toujours** ;
- `usage_events` — sessions, clics, extension, entonnoir, rétention : **valable à partir du déploiement**.

Conséquence assumée : les colonnes **Sessions** et **Clics** restent vides pour tout ce qui précède la mise en ligne, et les chiffres qui en dépendent portent la mention « depuis le <date de première mesure> ». Cette date est lue en base (`min(occurred_at)`), pas écrite en dur.

## 7. Confidentialité

- **Page Confidentialité** (`src/pages/legal/PrivacyPage.tsx`) : un paragraphe indiquant ce qui est mesuré (actions listées, total de clics par session), ce qui ne l'est pas (aucun contenu de candidature, aucun libellé de bouton, aucun traceur tiers), où les données sont hébergées (Supabase, comme le reste), la durée de conservation (13 mois) et la façon de s'y soustraire.
- **Interrupteur de refus** : nouvelle section de `MyBoardPage`, « Mesure d'usage », avec une case « Ne pas mesurer mon usage ». Elle écrit dans `usage_preferences`, et la règle RLS du §4.2 fait le reste.
- Pas de bandeau de consentement : la mesure est limitée à l'audience, pour le seul compte de l'éditeur, sans recoupement ni transmission à un tiers, avec moyen de refus — cadre proche de l'exemption CNIL pour la mesure d'audience. **Ce n'est pas un avis juridique.**

## 8. Tests et vérification

- `src/lib/usage.test.ts` (TDD) : mise en file, envoi par lot aux trois déclencheurs, plafond de 500, refus qui n'émet rien, échec réseau avalé sans exception, compteur de clics, source `extension`.
- `src/lib/adminStats.test.ts` : mise en forme des chiffres renvoyés par les RPC (médianes, parts, périodes, libellé « depuis le … »).
- Vérification manuelle en base sur un tableau de test : créer un tableau, produire quelques événements, vérifier que `admin_boards(30)` le montre, que le refus bloque bien l'insertion, et qu'un utilisateur non listé dans `admin_users` reçoit `forbidden`.
- `npm run build:lite` doit rester vert : `scripts/check-lite-bundle.mjs` vérifie que rien d'inutile n'entre dans le paquet `lite`.

## 9. Hors périmètre

- Mesure en édition `full`.
- Export CSV des chiffres, alertes, envoi de rapports par email.
- Suivi des visiteurs **non connectés** (page d'entrée, taux de création de tableau) : demanderait un identifiant avant session, donc un tout autre régime de confidentialité.
- Enregistrement de session, cartes de chaleur, suivi de parcours détaillé.
- Reconstruction rétroactive de l'usage passé.

## 10. Risques

| Risque | Traitement |
|---|---|
| Un utilisateur gonfle ses propres chiffres | Accepté : il ne peut écrire que pour son tableau, et aucun autre n'est affecté. |
| Croissance non bornée de `usage_events` | Purge à 13 mois dans `admin_kpis`, plafond de 500 événements par session, dictionnaire fermé. |
| Une erreur de mesure casse l'application | `track` n'échoue jamais bruyamment : file en mémoire, envoi détaché, erreurs avalées. |
| `/admin` découverte par un tiers | Aucune donnée n'est lisible sans être dans `admin_users` : les RPC lèvent `forbidden`, et `usage_events` n'a aucune règle de lecture. |
| Le nombre de tableaux est trop faible pour que les moyennes veuillent dire quelque chose | Médianes affichées à côté des moyennes, et effectifs toujours montrés à côté des pourcentages. |
