# Accès par code — version simplifiée sans inscription

- **Date** : 2026-09-13
- **Statut** : écrans validés par l'utilisateur ; spec en relecture
- **Branche** : `feature/lite-access-code` (depuis `feature/lite-edition` @ `6c328aa`)
- **Dépend de** : `docs/superpowers/specs/2026-09-13-lite-edition-design.md` (éditions `lite` / `full`)

## 1. Contexte et objectif

L'édition `lite` (publique) exige aujourd'hui un compte (email + mot de passe ou Google). L'utilisateur veut qu'on puisse l'utiliser **sans inscription** : une personne crée son tableau de candidatures et y accède par un **code d'accès** (chiffres et lettres). Un compte reste **facultatif** : on peut plus tard « sécuriser » son tableau avec un email pour le retrouver par **lien magique** si le code est perdu.

L'édition `full` (usage personnel) garde les comptes classiques, inchangée.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Parcours | « C · le code d'abord » : l'accueil est l'écran « Entre ton code d'accès » ; le lien n'est qu'un raccourci qui pré-remplit le code |
| Comptes | Code + compte facultatif (« Sécuriser avec mon email ») ; pas de connexion email/mot de passe ni Google en `lite` |
| Reconnexion d'un tableau sécurisé | Lien magique par email (pas de mot de passe) |
| Page « Mon tableau » (remplace Profil en `lite`) | Sécuriser avec mon email · Générer un nouveau code · Quitter ce tableau · Supprimer mon tableau |
| Approche technique | « A · compte discret par tableau » : chaque tableau est un vrai utilisateur Supabase Auth créé côté serveur ; le code ouvre une session via une fonction serveur |
| Style | Colonne centrée, petit libellé vert en capitales, grand titre bleu nuit, champ + bouton pleine largeur, en-tête logo JobTracker (écrans validés en brainstorming) |

Approches écartées :
- **Utilisateurs anonymes Supabase** : une session anonyme ne peut pas être rouverte depuis un autre appareil sans fabriquer des jetons à la main ; exigerait d'activer l'option et un captcha.
- **Accès par fonctions SQL recevant le code** : réécriture de toute la couche de données de `lite`, code envoyé à chaque requête, rattachement à un email difficile.

## 3. Parcours et écrans (`lite` uniquement)

Tous les textes sont en français (comme Accueil et Candidatures).

### 3.1 Non connecté — `LiteAccessGate`

Remplace `LoginPage` quand `FEATURES.accessCode` est vrai (en `full`, `LoginPage` inchangée). Machine à états interne, sans routeur : `code` → `created` | `magic` → `magic-sent`.

1. **Accueil (`code`)** — en-tête : logo + « JobTracker » + « Suivi de candidatures, sans inscription » ; bouton contour « Créer un tableau » à droite.
   - Libellé « ACCÈS À TON TABLEAU », titre « Entre ton code d'accès », texte « Le code t'a été donné à la création de ton tableau. », note « 12 caractères : ce code ouvre toutes tes candidatures. »
   - Champ « Code d'accès » : accepte minuscules, espaces et tirets ; affiché au format `XXXX-XXXX-XXXX` ; bouton « Ouvrir mon tableau ».
   - Lien « Tableau sécurisé par email ? Recevoir un lien de connexion » → état `magic`.
   - Erreurs :
     - format invalide (côté client, sans appel serveur) : « Le code fait 12 caractères (chiffres et lettres). »
     - code inconnu (401) : « Ce code ne correspond à aucun tableau. Vérifie les caractères. »
     - trop d'essais (429) : « Trop de tentatives. Réessaie dans quelques minutes. »
     - réseau / serveur : « Impossible de joindre JobTracker. Réessaie. »
2. **Raccourci** — au chargement, si `location.hash` correspond exactement à un code (12 symboles de l'alphabet, tirets et minuscules acceptés, **sans `=`**), le code est pré-rempli et envoyé automatiquement, puis retiré de l'adresse (`history.replaceState`). Un hash contenant `=` (retour de lien magique `#access_token=…`) est ignoré et laissé au client Supabase.
3. **Création (`created`)** — après « Créer un tableau » (erreur de création : « Impossible de créer le tableau. Réessaie. » ; 429 : « Trop de tableaux créés depuis ce réseau. Réessaie plus tard. ») :
   - Libellé « TABLEAU CRÉÉ », titre « Voici ton code d'accès », note « Note-le : il ne sera plus jamais affiché. Sans lui (ou sans email rattaché), le tableau est perdu. »
   - Code en grand, boutons « Copier le code » et « Copier le raccourci » (`<origine>/#XXXX-XXXX-XXXX`).
   - Case « J'ai noté mon code » ; « Ouvrir mon tableau » désactivé tant qu'elle n'est pas cochée ; au clic, ouverture de la session (§4.4).
4. **Lien magique (`magic`)** — libellé « TABLEAU SÉCURISÉ », titre « Reçois ton lien de connexion », texte « Tape l'email rattaché à ton tableau. On t'envoie un lien qui l'ouvre directement. », champ « Email », bouton « Recevoir mon lien », lien « ← J'ai mon code ».
   - Limite d'envoi Supabase atteinte : « Trop de demandes. Réessaie dans une minute. » ; réseau : « Impossible de joindre JobTracker. Réessaie. »
5. **Envoyé (`magic-sent`)** — titre « Regarde ta boîte mail », texte « Si un tableau est rattaché à cet email, tu vas recevoir un lien qui l'ouvre directement. » (même écran que l'email existe ou non).

Sur cet appareil, la session reste ouverte aux visites suivantes (comportement actuel de Supabase) jusqu'à « Quitter ce tableau ».

### 3.2 Connecté — application

- Menu : Accueil, Candidatures (inchangés). **« Mon tableau »** (`/mon-tableau`, icône réglages) :
  - sidebar desktop : dans la zone du bas, **à la place** du bloc avatar + nom + email + déconnexion (aucun nom ni email n'est affiché en `lite`) ;
  - barre mobile : 3ᵉ onglet.
- Route `/profile` non déclarée en `lite` (redirection `*` → `/`) ; en `full`, `/profile` et le bloc profil de la sidebar sont inchangés.
- Accueil : inchangé (salutation « Bonjour 👋 » sans prénom quand il n'y en a pas).

### 3.3 Page « Mon tableau » — `MyBoardPage`

Libellé « RÉGLAGES », titre « Mon tableau », quatre sections :

1. **Sécuriser avec mon email** — pastille d'état :
   - « non sécurisé » (`isBoardEmail(user.email)` vrai) : champ email + « Envoyer l'email de confirmation » ;
   - « en attente de confirmation » (`user.new_email` présent) : « Un email de confirmation a été envoyé à <new_email>. Clique sur le lien reçu pour terminer. » + « Renvoyer » ;
   - « sécurisé » : « Sécurisé avec <email> ».
   - Email déjà utilisé : « Cet email est déjà utilisé par un autre compte. » ; format invalide : « Cet email n'est pas valide. »
2. **Code d'accès** — « Ton code a fuité ? Génère-en un nouveau : l'ancien ne marchera plus et les autres appareils devront le retaper. » ; bouton « Générer un nouveau code » → confirmation dans la page (« L'ancien code ne marchera plus. Continuer ? » + « Générer » / « Annuler ») → `CodeRevealPanel` (code affiché une fois, copier, « J'ai noté mon code » pour fermer). Générer un nouveau code révoque aussi les sessions ouvertes sur les autres appareils (`board-rotate-code`, §4.4) : les sessions ouvertes sur les autres appareils sont fermées, seule celle qui vient de générer le code reste connectée.
3. **Quitter ce tableau** — « Ferme le tableau sur cet appareil. Il faudra retaper le code. » → `supabase.auth.signOut({ scope: 'local' })` (ferme uniquement cet appareil) → accueil.
4. **Supprimer mon tableau** (rouge) — « Efface définitivement le tableau et toutes ses candidatures. » → `DeleteBoardDialog` : taper `SUPPRIMER` pour activer « Supprimer définitivement » → fonction `board-delete` (§4.4) → `signOut()` → accueil.

Aucune boîte de dialogue native du navigateur (`window.confirm`, `alert`) sur ces écrans.

## 4. Architecture

### 4.1 Identité d'un tableau

- Un tableau = un utilisateur Supabase Auth créé par la fonction `board-create` via `admin.createUser({ email: 'board-' + crypto.randomUUID() + '@' + BOARD_EMAIL_DOMAIN, email_confirm: true, user_metadata: { board: true } })`, **sans mot de passe**.
- `BOARD_EMAIL_DOMAIN = 'boards.jobtracker.invalid'` (TLD `.invalid` réservé, RFC 2606 : ne reçoit jamais d'email). **Aucun email n'est envoyé** à ces adresses : création confirmée par l'admin, `generateLink` n'envoie rien, et le changement d'email ne sollicite que la nouvelle adresse (§4.5). La première tâche du plan vérifie que Supabase accepte ce domaine ; s'il le refuse, l'implémentation s'arrête et l'utilisateur choisit un domaine qu'il possède.
- `BOARD_EMAIL_DOMAIN` est une **constante unique** du module partagé (§4.6), utilisée par le client et les fonctions serveur. Un tableau est « sécurisé » dès que son email ne se termine plus par `@boards.jobtracker.invalid`.
- Toutes les données restent keyées `userId = auth.uid()` : **aucune policy RLS, table métier ni hook de données existant n'est modifié**.

### 4.2 Code d'accès

- **Alphabet** (30 symboles, sans 0 O 1 I L U) : `23456789ABCDEFGHJKMNPQRSTVWXYZ`.
- **Longueur** : 12 symboles (≈ 58,9 bits), affichés `XXXX-XXXX-XXXX`.
- **Génération** : côté serveur uniquement, `crypto.getRandomValues` sur des octets ; tout octet ≥ 240 est rejeté puis `octet % 30` (pas de biais modulo).
- **Normalisation** : majuscules, suppression de tout caractère hors `[A-Z0-9]` ; valide si exactement 12 symboles, tous dans l'alphabet.
- **Stockage** : jamais en clair. `code_hash = HMAC-SHA-256(CODE_PEPPER, code_normalisé)` en hexadécimal minuscule (64 caractères). WHY un hash rapide suffit : le code est aléatoire à ~59 bits et le pepper est un secret serveur, l'attaque hors ligne est impraticable.
- Le code n'est jamais journalisé (ni dans les logs des fonctions, ni dans les messages d'erreur).

### 4.3 Base de données — migration `supabase/migrations/20260913120000_board_access.sql`

```sql
create table public.board_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  code_rotated_at timestamptz,
  last_opened_at timestamptz
);
alter table public.board_access enable row level security;  -- aucune policy : service_role uniquement

create table public.access_attempts (
  bucket text not null,          -- ex. 'open:<hmac(ip)>'
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.access_attempts enable row level security;  -- aucune policy
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

  -- WHY: purge globale (pas seulement le bucket courant), sinon un bucket qui n'est plus jamais
  -- rappelé garde ses lignes indéfiniment.
  delete from public.access_attempts where window_start < now() - interval '24 hours';

  return v_hits <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Défense en profondeur : RLS est déjà activée sans policy, on retire aussi les droits directs.
revoke all on table public.board_access, public.access_attempts from anon, authenticated;

-- Suppression atomique (une transaction) des données d'un tableau, appelée par board-delete avant
-- admin.deleteUser. cv_documents et ats_analyses ne sont pas listées : elles cascadent déjà depuis
-- auth.users. tasks.user_id et user_goals.user_id référencent auth.users sans cascade : sans cette
-- fonction, admin.deleteUser échouerait (contrainte de clé étrangère) si ces tables contiennent des
-- lignes pour le tableau.
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
```

### 4.4 Fonctions serveur (Deno, même structure que `delete-account`)

Code partagé dans `supabase/functions/_shared/` (imports relatifs avec extension `.ts`) :
- `accessCode.ts` — module pur §4.6 ;
- `clientIp.ts` — module pur : `clientIpFromHeaders(get)` détermine l'IP appelante à partir de `cf-connecting-ip` (non falsifiable par le client) sinon de la **dernière** entrée de `x-forwarded-for` (la première peut être fixée par le client, l'infrastructure ajoute la vraie IP en dernier), sinon `'unknown'` ; une IPv6 est regroupée par `/64` (`h1:h2:h3:h4::/64`) pour ne pas fragmenter la limite par adresse, une IPv4 (y compris IPv4-mappée `::ffff:a.b.c.d`) reste une adresse exacte ;
- `http.ts` — en-têtes CORS (identiques à `delete-account`), `json(payload, status)`, réponse `OPTIONS` ;
- `supabaseDeps.ts` — client `service_role` depuis `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, `getCaller(ctx, req): Promise<{ id, token } | null>` (utilisateur du JWT via `auth.getUser`, `null` si absent ou invalide), `ipKey(ctx, req)` (`clientIpFromHeaders` puis `HMAC-SHA-256(CODE_PEPPER, 'ip:' + ip)`) et `allow(bucket, limit, windowSeconds)` (RPC `hit_rate_limit`).

Secret requis : `CODE_PEPPER`. Toute fonction renvoie 500 `{ error: 'server_misconfigured' }` s'il manque un secret.

| Fonction | JWT | Limite | Entrée → sortie |
|---|---|---|---|
| `board-create` | non (`--no-verify-jwt`) | 5 / heure / IP | `{}` → `{ code, tokenHash }` |
| `board-open` | non (`--no-verify-jwt`) | 10 / 15 min / IP | `{ code }` → `{ tokenHash }` |
| `board-rotate-code` | oui | 5 / heure / utilisateur | `{}` → `{ code }` |
| `board-delete` | oui | — | `{}` → `{ success: true }` |

- **`board-create`** : limite (429 `{ error: 'rate_limited' }`) → génère le code → `admin.createUser` → insert `board_access` (en cas de conflit d'unicité sur `code_hash` : nouveau code, un seul réessai) → `admin.generateLink({ type: 'magiclink', email })` → `{ code, tokenHash: properties.hashed_token }`. Si une étape échoue après la création de l'utilisateur, il est supprimé (`admin.deleteUser`) avant de répondre 500 `{ error: 'create_failed' }`.
- **`board-open`** : limite (429) → normalise ; format invalide → 400 `{ error: 'invalid_format' }` → lookup par `code_hash` ; absent → 401 `{ error: 'invalid_code' }` → `admin.getUserById` → `generateLink` magiclink sur l'email **actuel** (technique ou réel) → `last_opened_at = now()` → `{ tokenHash }`. Le code marche donc aussi après sécurisation.
- **`board-rotate-code`** : `getCaller` (401 sinon) → limite `rotate:<user_id>` (429) → nouveau code → `update board_access set code_hash, code_rotated_at = now() where user_id` ; aucune ligne mise à jour (compte classique sans tableau) → 404 `{ error: 'not_a_board' }` → sur succès, `admin.auth.admin.signOut(caller.token, 'others')` pour révoquer les sessions ouvertes sur les autres appareils avec l'ancien code (best-effort : un échec de révocation ne bloque pas la réponse, l'ancien code est de toute façon déjà refusé) → `{ code }`.
- **`board-delete`** : `getCaller` (401 sinon) → vérifie qu'une ligne `board_access` existe (404 `not_a_board` sinon, pour ne jamais supprimer un compte classique par cette voie) → `admin.rpc('delete_board_data', { p_user_id })` (une transaction : `"TimelineStep"`, `"Application"`, `"OrgLogo"`, `"Profile"`, `tasks`, `user_goals` — §4.3) → `admin.deleteUser(user_id)` (la ligne `board_access` part en cascade) → `{ success: true }`. WHY une fonction dédiée : `delete-account` ne supprime pas les lignes keyées par `userId` texte (pas de cascade depuis `auth.users`) et porte une modification non commitée de l'utilisateur, que cette branche ne touche pas.
- Côté client, `tokenHash` est échangé par `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`, qui crée une session persistée normale.
- CORS : mêmes en-têtes que `delete-account` (`*`) ; la restriction au domaine de prod reste un prérequis de lancement (hors périmètre).

### 4.5 Sécuriser avec un email et lien magique

- **Sécuriser** : `supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin })`. Supabase envoie un lien à la nouvelle adresse ; l'email n'est remplacé qu'au clic (pas de risque de faute de frappe).
- **Prérequis Supabase : désactiver « Secure email change »** (Authentication → Providers → Email). Sinon Supabase exigerait aussi une confirmation sur l'adresse technique, impossible. Conséquence : pour les comptes classiques de l'édition `full`, changer d'email ne demande plus de confirmer l'ancienne adresse (une session reste nécessaire).
- **Lien magique** : `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })`. `shouldCreateUser: false` empêche de créer un compte par ce biais ; l'erreur « utilisateur inexistant » est traitée comme un succès (écran `magic-sent`). Le retour est traité par le client existant (`detectSessionInUrl: true`).

### 4.6 Front

**Module partagé pur** `supabase/functions/_shared/accessCode.ts` (aucune API Deno ni Node, aucun import ; Web Crypto uniquement, disponible dans le navigateur, Deno et Node 24), réexporté tel quel par `src/lib/accessCode.ts` :
- `ACCESS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'`, `ACCESS_CODE_LENGTH = 12`, `BOARD_EMAIL_DOMAIN = 'boards.jobtracker.invalid'`
- `generateAccessCode(): string` (normalisé, sans tirets)
- `normalizeAccessCode(input: string): string`
- `isValidAccessCode(normalized: string): boolean`
- `formatAccessCode(normalized: string): string` (`XXXX-XXXX-XXXX`)
- `parseShortcutHash(hash: string): string | null` (code normalisé et valide, sinon `null` ; `null` si `=` présent)
- `hashAccessCode(normalized: string, pepper: string): Promise<string>` (HMAC-SHA-256, hex minuscule)
- `isBoardEmail(email: string | null | undefined): boolean`

**Édition** : `FeatureKey` gagne `'accessCode'` ; `featuresFor('lite').accessCode === true`, `featuresFor('full').accessCode === false` (les trois autres drapeaux inchangés).

**Hook** `src/hooks/useBoardAccess.ts` (tous les appels passent par lui ; il renvoie des messages d'erreur français prêts à afficher, §3) :
- `createBoard(): Promise<{ code: string; tokenHash: string } | { error: string }>`
- `enterBoard(tokenHash: string): Promise<string | null>` (erreur ou `null`)
- `openBoard(input: string): Promise<string | null>` (normalise, valide, appelle `board-open`, puis `enterBoard`)
- `requestMagicLink(email: string): Promise<string | null>`
- `secureWithEmail(email: string): Promise<string | null>`
- `rotateCode(): Promise<{ code: string } | { error: string }>`
- `leaveBoard(): Promise<void>`
- `deleteBoard(): Promise<string | null>`

**Composants** (≤ ~200 lignes chacun) :
- `src/components/access/AccessLayout.tsx` — en-tête + colonne centrée du style validé
- `src/components/access/AccessCodeScreen.tsx`, `BoardCreatedScreen.tsx`, `MagicLinkScreen.tsx`, `MagicLinkSentScreen.tsx`
- `src/components/access/CodeRevealPanel.tsx` — code affiché une fois + copier + « J'ai noté mon code » (création et nouveau code)
- `src/components/access/LiteAccessGate.tsx` — machine à états §3.1 + raccourci
- `src/pages/MyBoardPage.tsx` + `src/components/access/DeleteBoardDialog.tsx`

**Branchements** :
- `App.tsx` : non connecté → `FEATURES.accessCode ? <LiteAccessGate /> : <LoginPage …/>` ; route `mon-tableau` seulement si `FEATURES.accessCode` ; route `profile` seulement si `!FEATURES.accessCode`.
- `Sidebar.tsx` : si `FEATURES.accessCode`, bloc du bas = lien « Mon tableau » ; sinon inchangé.
- `MobileBottomNav.tsx` : si `FEATURES.accessCode`, 3ᵉ onglet « Mon tableau ».
- Traductions : clé `sidebar.myBoard` (FR « Mon tableau », EN « My board »).

### 4.7 Configuration Supabase à faire par l'utilisateur

Actions sur le projet live, hors du dépôt, réalisées par l'utilisateur (ou par l'implémentation avec son accord explicite) :
1. Secret des fonctions : `CODE_PEPPER` (≥ 32 octets aléatoires).
2. Appliquer la migration `board_access`.
3. Déployer `board-create` et `board-open` avec `--no-verify-jwt`, `board-rotate-code` et `board-delete` avec vérification JWT.
4. Désactiver « Secure email change ».
5. SMTP personnalisé (requis par « Sécuriser » et le lien magique ; déjà prérequis du lancement).
6. Ajouter les URLs de redirection (dev `http://localhost:5174`, domaine de prod).
7. Laisser les connexions anonymes désactivées (inutiles).

## 5. Sécurité

| Menace | Parade |
|---|---|
| Deviner un code | ~59 bits d'entropie + 10 essais / 15 min / IP |
| Savoir si un code ou un email existe | Erreurs génériques ; même écran « Regarde ta boîte mail » |
| Fuite de la base | Codes stockés en HMAC avec pepper secret ; IP hachées |
| Code dans l'historique / les logs serveur | Raccourci en fragment `#` (jamais envoyé au serveur) et retiré de l'adresse ; code jamais journalisé |
| Code qui a fuité | « Générer un nouveau code » invalide l'ancien immédiatement et révoque les sessions ouvertes ailleurs (`admin.auth.admin.signOut(token, 'others')`) |
| En-tête IP falsifié par le client | `cf-connecting-ip` (posé par l'infrastructure, non falsifiable) sinon la dernière entrée de `x-forwarded-for` ; jamais la première, que le client peut fixer lui-même |
| Création massive de tableaux par un robot | 5 créations / heure / IP (captcha hors périmètre) |
| Faute de frappe à la sécurisation | Email remplacé seulement après clic sur le lien reçu |
| Création de compte via lien magique | `shouldCreateUser: false` |
| Supprimer un compte classique via `board-delete` | Refus si aucune ligne `board_access` |
| Clé `service_role` | Uniquement dans les fonctions serveur, jamais côté client |

## 6. Tests et vérification

- **Vitest** :
  - `accessCode` : alphabet (30 symboles, aucun de `0 O 1 I L U`) ; `generateAccessCode` (longueur 12, symboles de l'alphabet, 1 000 codes tous différents) ; `normalizeAccessCode` (minuscules, espaces, tirets) ; `isValidAccessCode` (longueur, symbole interdit) ; `formatAccessCode` ; `parseShortcutHash` (`#k7q2-m9xp-4rwd` → `K7Q2M9XP4RWD`, `#access_token=…` → `null`, `''` → `null`, code invalide → `null`) ; `hashAccessCode` (déterministe, dépend du pepper, 64 caractères hex) ; `isBoardEmail` (`board-x@boards.jobtracker.invalid` → vrai, email réel → faux, `null` → faux).
  - `clientIp` : `cf-connecting-ip` l'emporte sur un `x-forwarded-for` falsifié ; dernière entrée de `x-forwarded-for` retenue sinon ; `'unknown'` sans en-tête ; espaces retirés ; deux IPv6 du même `/64` (forme complète et compressée) donnent la même clé, deux `/64` différents donnent des clés différentes ; `::ffff:1.2.3.4` → `1.2.3.4`.
  - `shortcutLocation` (`takeShortcutCode`) : fragment valide → code normalisé + `replaceUrl` appelé avec `pathname + search` ; retour de lien magique ou fragment vide → chaîne vide et `replaceUrl` non appelé.
  - `boardHandlers` : en plus des cas de la version initiale, `insertAccess` renvoyant `'error'` (pas `'conflict'`) → 500 `create_failed`, un seul appel à `insertAccess` (pas de réessai), `deleteUser` appelé ; `handleRotate`/`handleDelete` prennent un `BoardCaller | null` (`{ id, token }`) ; `revokeOtherSessions` appelé avec le jeton de l'appelant après une mise à jour réussie du code, jamais appelé sur `not_found`/`error`, et la réponse reste 200 avec le code même si `revokeOtherSessions` renvoie `false`.
  - `editionCore` : drapeau `accessCode` (lite `true`, full `false`).
- **Non-régression** : `npx tsc`, `npm run lint`, `npm test`, `npm run build:lite` (contrôle du bundle toujours propre), `npm run build:full`.
- **Intégration sur le projet Supabase** (après §4.7, avec accord) : créer un tableau → l'ouvrir avec le code dans un autre navigateur → ajouter une candidature et une étape → nouveau code : l'ancien est refusé (401), le nouveau marche → 11 codes faux : 429 → sécuriser avec un email → recevoir et suivre le lien magique → supprimer le tableau : code refusé ensuite, aucune ligne `board_access`, `"Application"`, `"TimelineStep"` restante pour cet utilisateur.
- **Navigateur** (édition `lite`) : écrans §3, raccourci `/#CODE`, mobile (3ᵉ onglet), aucun nom ni email technique visible ; édition `full` : connexion classique et page Profil inchangées.

## 7. Hors périmètre

- Purge automatique des tableaux abandonnés (RGPD) : `last_opened_at` est préparé, la tâche planifiée viendra plus tard.
- Captcha à la création.
- Restriction CORS, SMTP, hébergement, révocation de la clé OpenAI (prérequis de lancement déjà listés).
- Traduction anglaise des nouveaux écrans (hors clé de menu).
- Conversion de comptes classiques existants en tableaux.
- Correction de `delete-account` pour les comptes classiques (modification en cours côté utilisateur).

## 8. Risques

| Risque | Parade |
|---|---|
| Supabase refuse le domaine `boards.jobtracker.invalid` | Vérifié en première tâche ; en cas de refus, arrêt et choix d'un domaine par l'utilisateur |
| Clé étrangère `"Application".userId → "User"` présente en live (non vérifiable avec la clé publique) | Les tableaux sont de vrais utilisateurs Auth, comme les comptes Google actuels qui créent déjà des candidatures ; confirmé par le test d'intégration |
| Comportement de `generateLink` / `verifyOtp` différent en live | Test d'intégration ; API vérifiée dans `@supabase/auth-js` 2.104.1 |
| « Secure email change » désactivé pour tout le projet | Conséquence documentée §4.5 ; acceptée par l'utilisateur à la relecture de cette spec |
| Déploiement des fonctions et de la migration nécessite les droits Supabase de l'utilisateur | Étapes §4.7 réalisées par lui ou avec son accord explicite |
