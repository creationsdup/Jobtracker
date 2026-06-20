# Inscription : ajout prénom, nom, date de naissance

Date : 2026-06-21

## Contexte

Le formulaire d'inscription (`LoginPage.tsx`, mode `signup`) ne demande
aujourd'hui que l'email et le mot de passe. Le profil utilisateur
(`Profile` table) reste donc vide tant que l'utilisateur ne va pas le
compléter manuellement dans les Paramètres.

Objectif : compléter le profil dès la création du compte, sans
introduire de logique métier liée à l'âge (pas de vérification d'âge
minimum).

## Décisions validées

- Champs ajoutés : prénom, nom (obligatoires), date de naissance
  (optionnelle).
- Formulaire à une seule étape (pas de wizard) — tous les champs
  restent sur l'écran d'inscription actuel.
- La date de naissance reste éditable plus tard, dans Paramètres,
  comme le prénom/nom le sont déjà.

## Problème technique : RLS et session absente à l'inscription

Le projet Supabase de cette app exige la confirmation par email
(confirmé via les logs Auth). Au moment de `supabase.auth.signUp()`,
aucune session n'est active tant que l'utilisateur n'a pas cliqué le
lien de confirmation — le client Supabase n'est donc pas authentifié,
et une insertion directe dans `Profile` échouerait (RLS:
`auth.uid() = id`).

**Solution retenue** : passer prénom/nom/date de naissance dans les
`user_metadata` Supabase Auth via `options.data` au moment du
`signUp()`. Ces metadata sont rattachées à l'utilisateur dès sa
création, sans dépendre d'une session active. Elles sont relues une
fois que l'utilisateur se connecte pour la première fois (à ce
moment, `ensureRemoteProfile` — déjà appelé au premier login — crée la
ligne `Profile` ; on la préremplit alors avec les metadata).

## Modèle de données

Migration SQL (`supabase/migrations/`) :

```sql
alter table "Profile" add column "birthDate" date;
```

- Nullable, pas de contrainte de format particulière (le `date`
  Postgres suffit).
- Pas de colonnes `firstName`/`lastName` séparées : on continue à
  combiner dans `fullName`, comme c'est déjà le cas dans
  `ProfilePage.tsx` (qui les sépare en splitant sur le premier
  espace). Changer ce schéma serait un refactor plus large, hors
  scope ici.

`Profile` interface (`useProfile.ts`) : ajout de
`birthDate: string | null` (format `YYYY-MM-DD`, ou `null`).

## Formulaire d'inscription (`LoginPage.tsx`)

En mode `signup` uniquement, ajout de 3 champs avant email/mot de
passe :

- **Prénom** (`text`, requis)
- **Nom** (`text`, requis)
- **Date de naissance** (`input type="date"`, optionnel)

Validation côté client avant soumission :
- Prénom et nom non vides (trim).
- Si date de naissance renseignée : doit être une date valide et ne
  pas être dans le futur. Message d'erreur en français
  (`login.birthDateFuture` ou équivalent).

`onSignUp` (prop de `LoginPage`) change de signature pour accepter
ces champs :

```ts
onSignUp: (
  email: string,
  password: string,
  profile: { firstName: string; lastName: string; birthDate: string | null }
) => Promise<{ error: ...; needsConfirmation: boolean }>
```

`useAuth.signUp` transmet ces données à Supabase :

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { firstName, lastName, birthDate } },
})
```

Le flux existant (message de confirmation email visible, erreurs
traduites en français via `getAuthErrorMessage`) ne change pas.

## Sync au premier profil (`useProfile.ts`)

`ensureRemoteProfile(userId, fallbackEmail)` est actuellement appelée
quand la ligne `Profile` n'existe pas encore (after first login). Elle
prend aujourd'hui `userId` et `fallbackEmail` ; elle doit aussi
recevoir les `user_metadata` de la session (déjà disponibles via
`supabase.auth.getSession()` au moment de l'appel, ou passées en
paramètre depuis l'appelant qui a déjà la session).

À la création de la ligne :
- `fullName` = `${firstName} ${lastName}`.trim() si les deux sont
  présents dans les metadata, sinon `''` (comportement actuel
  inchangé si pas de metadata — ex. comptes créés avant ce
  changement, ou connexion Google qui n'a pas ces metadata).
- `birthDate` = metadata.birthDate si présent, sinon `null`.

Pas de migration de données pour les comptes existants : les metadata
n'existent que pour les inscriptions faites après ce changement.

## Page Paramètres (`ProfilePage.tsx`)

Dans la section "Informations personnelles", ajout d'un champ Date de
naissance (`input type="date"`) à côté de Prénom/Nom existants,
sauvegardé via `updateProfile({ birthDate })`. Même pattern que les
champs existants (état local, bouton Enregistrer, message de succès
temporaire).

## Hors scope

- Pas de vérification d'âge minimum ni de blocage légal.
- Pas de migration des `firstName`/`lastName` en colonnes séparées.
- Pas de backfill des comptes existants (ils n'ont simplement pas de
  date de naissance jusqu'à ce qu'ils la renseignent dans Paramètres).
