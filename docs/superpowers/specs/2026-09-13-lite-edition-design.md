# Édition « lite » — première version publique de JobTracker

- **Date** : 2026-09-13
- **Statut** : design validé, spec en relecture
- **Branche** : `feature/lite-edition` (depuis `feature/ios-capacitor` @ `6e5464f`), worktree `.worktrees/lite-edition`

## 1. Contexte et objectif

JobTracker (web) regroupe aujourd'hui : Accueil, Candidatures (liste/grille/kanban), Objectifs + score de match, Bibliothèque (CV, analyses ATS) et plusieurs fonctions IA (import d'offre, lettre de motivation, recherche du site d'une entreprise).

On veut ouvrir **au public** une première version réduite au cœur de valeur — le suivi des candidatures — sans livrer les fonctions IA, qui ne sont pas encore sécurisées (clé OpenAI exposée dans le bundle, edge function sans quota, SSRF ; cf. audit de sécurité du 2026-08-27).

La version complète doit rester disponible pour l'usage personnel de l'auteur.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Public visé | Lancement public (inscription libre email + Google) |
| Périmètre lite | Candidatures (liste/grille/kanban + formulaire + fiche détail), Accueil, Profil |
| Retiré en lite | Fonctions IA, page Objectifs (et donc score de match), Bibliothèque |
| Approche | Un seul code ; l'édition est choisie **au build** par `VITE_EDITION` (`lite` \| `full`) |
| Valeur par défaut | `lite` (fail-closed : un oubli de configuration ne livre jamais l'IA) |
| Carte « Objectif du mois » | En lite, devient un simple compteur mensuel (voir §4.6) |

Approches écartées :
- **Branche git allégée** (suppression physique du code) : chaque correctif du tableau devrait être reporté entre deux branches qui divergent.
- **Masquer seulement la navigation** : pages accessibles par URL et IA toujours dans le bundle — inacceptable pour un lancement public.

## 3. Architecture

### 3.1 Noyau pur — `src/config/editionCore.ts`

Module sans dépendance à Vite ni au DOM, importable par `vite.config.ts` et par les tests :

- `export type Edition = 'lite' | 'full'`
- `export type FeatureKey = 'goals' | 'library' | 'ai'`
- `export type FeatureFlags = Record<FeatureKey, boolean>`
- `export function resolveEdition(raw: string | undefined): Edition`
  - `undefined` ou chaîne vide après `trim` → `'lite'`
  - `'lite'` / `'full'` → la valeur
  - toute autre valeur → `throw new Error('VITE_EDITION invalide : "<valeur>" (attendu : lite | full)')`
- `export function featuresFor(edition: Edition): FeatureFlags` — les trois drapeaux valent `edition === 'full'`.
- `export function filterByFeature<T extends { feature?: FeatureKey }>(items: readonly T[], flags: FeatureFlags): T[]` — garde les éléments sans `feature` et ceux dont le drapeau est vrai, dans l'ordre d'origine.

### 3.2 Injection au build — `vite.config.ts`

- Passe à la forme `defineConfig(({ mode }) => …)`.
- Lit la variable via `loadEnv(mode, process.cwd(), '')`. Les variables déjà présentes dans l'environnement du shell ou de l'hébergeur **priment** sur `.env.local` (comportement standard de Vite) : `VITE_EDITION=lite npm run build` produit bien une édition lite même si `.env.local` contient `VITE_EDITION=full`.
- Appelle `resolveEdition` (une valeur invalide fait échouer le build) et injecte :
  - `define: { __APP_EDITION__: JSON.stringify(edition) }`
- `src/vite-env.d.ts` : `declare const __APP_EDITION__: 'lite' | 'full'`.
- `vitest.config.ts` : `define: { __APP_EDITION__: JSON.stringify('full') }`, pour que les modules qui lisent l'édition restent évaluables en test.

### 3.3 Drapeaux côté app — `src/config/edition.ts`

- `export const EDITION: Edition = __APP_EDITION__`
- `export const FEATURES: FeatureFlags = featuresFor(EDITION)`

`FEATURES` sert à tout ce qui est **rendu ou requêté** (boutons, routes, options de tri, argument `userId` des hooks).

**Règle pour les imports dynamiques** : partout où une condition protège un `import()` / `React.lazy` de code IA, Objectifs ou Bibliothèque, la condition est écrite **en littéral** : `__APP_EDITION__ === 'full'`.

**WHY** : Vite remplace `__APP_EDITION__` par la chaîne `"lite"` au build ; `"lite" === 'full'` est alors replié en `false` par Rollup, qui supprime la branche et **n'émet pas** le chunk importé. `FEATURES.ai` étant le résultat d'un appel de fonction, Rollup ne peut pas le replier : les chunks IA seraient émis dans `dist/` (même jamais chargés), avec la clé OpenAI si elle est définie.

## 4. Points de branchement

### 4.1 `src/App.tsx` — routes et données
- `GoalsPage` et `LibraryPage` : imports statiques remplacés par
  `const GoalsPage = __APP_EDITION__ === 'full' ? lazy(() => import('@/pages/GoalsPage').then(m => ({ default: m.GoalsPage }))) : null` (idem `LibraryPage`).
- Leurs `<Route>` ne sont rendues que si le composant n'est pas `null`, enveloppées dans un `<Suspense>` dont le fallback reprend l'écran « Chargement... » existant. En lite, `/goals` et `/library` tombent sur la route `*` existante → redirection vers `/`.
- `useGoals(FEATURES.goals ? user?.id ?? null : null)` — le hook accepte déjà `null` et ne fait alors aucune requête. `goal` vaut `null` en lite, ce qui masque naturellement les scores de match (cartes, tableau, kanban, fiche détail).
- Route `/kanban` conservée (fait partie du tableau).

### 4.2 Navigation — `src/components/layout/Sidebar.tsx`
- Les entrées de `NAV_LINKS` reçoivent `feature?: FeatureKey` : `/goals` → `'goals'`, `/library` → `'library'`.
- Nouvel export `VISIBLE_NAV_LINKS = filterByFeature(NAV_LINKS, FEATURES)`.
- `Sidebar` et `MobileBottomNav` consomment `VISIBLE_NAV_LINKS`. En lite : **Accueil, Candidatures** ; le Profil reste accessible via l'avatar du pied de sidebar (inchangé).
- La barre mobile calcule déjà son nombre de colonnes depuis la longueur de la liste : aucun changement de layout.

### 4.3 Fiche détail — `src/components/applications/ApplicationDetail.tsx`
- Bouton « Lettre IA » rendu seulement si `FEATURES.ai`.
- `CoverLetterGenerator` : `lazy` sous la condition littérale (§3.3), rendu dans un `<Suspense fallback={null}>`.
- `useExperiences(FEATURES.ai ? application.userId : null)` — les expériences ne servent qu'à la lettre ; plus de requête sur `"Experience"` en lite.
- Section « Correspondance avec votre objectif » : inchangée (déjà masquée quand `goal` est `null`).

### 4.4 Formulaire — `src/components/applications/ApplicationForm.tsx`
- `showImport={!initial && FEATURES.ai}` → pas de bouton d'import d'offre en lite.
- `JobOfferImporter` : `lazy` sous la condition littérale, rendu dans un `<Suspense fallback={null}>`.
- `handleCompanyBlur` : l'import statique de `guessCompanyDomain` est supprimé. Après les vérifications existantes, la fonction exécute `if (__APP_EDITION__ !== 'full') return`, puis `const { guessCompanyDomain } = await import('@/lib/ai')`. Restent actifs en lite : le catalogue partagé `company_domains` (`lookupCompanyDomain`) et la déduction depuis l'URL de l'annonce (`guessCompanyWebsiteFromJobUrl`).

### 4.5 Page Candidatures — `src/pages/ApplicationsPage.tsx`
- L'option de tri « Meilleur match » (`match_desc`) est retirée de `SORT_OPTIONS` si `!FEATURES.goals`.

### 4.6 Accueil — `src/pages/DashboardPage.tsx`
- `useGoals(FEATURES.goals ? userId : null)`.
- Carte « Objectif du mois », en lite uniquement :
  - titre : **« Activité du mois »** ;
  - la ligne `GoalRow` (« X / 10 » + barre de progression vers une cible non modifiable) est remplacée par un compteur « candidatures envoyées : N » sans cible ;
  - les lignes de conversion (entretiens obtenus, offres reçues) et le sélecteur de mois sont conservés.
- En `full`, la carte est inchangée.

### 4.7 `vite.config.ts` — chunks
- `manualChunks` déclare explicitement `vendor-pdf: ['pdfjs-dist']`. L'entrée `vendor-pdf` n'est ajoutée qu'en `full` (pdfjs n'est utilisé que par la Bibliothèque).

## 5. Garanties sur le build public

Trois couches indépendantes :

1. **Code** — tout ce qui mène à `src/lib/ai.ts` ou à `pdfjs-dist` (lettre, import d'offre, recherche de domaine, Objectifs, Bibliothèque) n'est atteint que par des imports dynamiques éliminés au build lite (§3.3).
2. **Environnement** — le déploiement public **ne définit pas** `VITE_OPENAI_API_KEY`.
3. **Contrôle automatique** — `scripts/check-lite-bundle.mjs` parcourt récursivement `dist/` et échoue (code de sortie 1, avec chaque fichier et motif trouvés) si :
   - un fichier contient `api.openai.com`, `sk-proj-`, `ai-assistant` ou `pdf.worker` ;
   - un fichier a un nom contenant `pdf.worker` (worker pdfjs émis comme asset via `?url`) ou commençant par `vendor-pdf`.

   Il échoue aussi si `dist/` n'existe pas.

Scripts `package.json` :
- `"build:lite": "VITE_EDITION=lite npm run build && node scripts/check-lite-bundle.mjs"`
- `"build:full": "VITE_EDITION=full npm run build"`
- `npm run build` reste inchangé (édition issue de l'environnement, `lite` par défaut).

Le contrôle est lancé **avec `VITE_OPENAI_API_KEY` présente dans l'environnement local** : il prouve que la couche « code » suffit à elle seule.

## 6. Tests et vérification

- **Vitest** — `src/config/editionCore.test.ts` :
  - `resolveEdition` : `undefined` → `lite` ; `''` et `'  '` → `lite` ; `'lite'` → `lite` ; `'full'` → `full` ; `'pro'` → erreur.
  - `featuresFor` : `lite` → trois drapeaux `false` ; `full` → trois `true`.
  - `filterByFeature` : drapeaux tous `false` → seules les entrées sans `feature` ; tous `true` → liste complète dans l'ordre d'origine ; un seul drapeau vrai → entrées sans `feature` + celles de ce drapeau.
- **Non-régression** : `npx tsc`, `npm run lint`, `npm test` passent ; `npm run build:full` et `npm run build:lite` réussissent (le second inclut le contrôle du bundle).
- **Navigateur** (`npm run dev` avec chaque édition) :
  - lite : menu = Accueil + Candidatures ; `/goals` et `/library` redirigent vers `/` ; fiche détail sans « Lettre IA » ni bloc correspondance ; formulaire sans import d'offre ; tri sans « Meilleur match » ; carte « Activité du mois » ; Profil accessible.
  - full : comportement identique à l'actuel.
- Le build prend ~8 min 30 (projet synchronisé iCloud) → lancé en arrière-plan.

## 7. Organisation

- Travail dans le worktree `.worktrees/lite-edition` ; les modifications non commitées du worktree principal (`supabase/functions/delete-account/index.ts`, `ios/App/App.xcodeproj/project.pbxproj`, migration non suivie) ne sont pas touchées.
- Commits conventionnels (`feat:`, `test:`, `chore:`, `docs:`), aucun push sans accord.
- `CLAUDE.md` : nouvelle section « Éditions lite / full » (variable, défaut `lite`, `build:lite` + contrôle du bundle, règle du littéral pour les imports dynamiques).
- Pour garder la version complète en local, `VITE_EDITION=full` doit être ajouté au `.env.local` de l'auteur (modification faite avec son accord).
- L'app iOS Capacitor embarque `dist/` tel que construit : elle sera en lite si elle est synchronisée après un build par défaut.

## 8. Hors périmètre — prérequis au lancement public

Cette spec ne couvre que l'édition lite. Le lancement public reste bloqué par trois autres chantiers, à concevoir séparément :

1. **Sécurité**
   - Révoquer la clé OpenAI actuellement exposée (elle a déjà été publiée dans des builds antérieurs).
   - Retirer ou restreindre l'edge function `ai-assistant` : le projet Supabase étant partagé entre l'édition publique et la version complète, **tout compte authentifié peut l'appeler** même sans bouton dans l'interface (consommation du crédit OpenAI, SSRF).
   - Mettre à jour `react-router` (open redirect signalé par `npm audit`).
   - Durcir la politique de mot de passe et activer la protection contre les mots de passe fuités (Supabase Auth).
   - Restreindre CORS des edge functions au domaine de production.
   - `delete-account` : supprimer aussi les fichiers du bucket `avatars`.
2. **Légal (RGPD)** — pages CGU, Politique de confidentialité, Contact (liens actuellement `href: '#'` dans `Footer.tsx`).
3. **Production**
   - Migration « baseline » recréant les tables cœur (`"Application"`, `"TimelineStep"`, `"OrgLogo"`, `company_domains`…), aujourd'hui absentes de `supabase/migrations/`.
   - Hébergement + domaine + variables d'environnement de prod (`VITE_EDITION=lite`, pas de clé OpenAI).
   - SMTP personnalisé dans Supabase Auth (le SMTP intégré n'est pas prévu pour des inscriptions publiques).
   - Écran de consentement Google OAuth publié.

## 9. Risques

| Risque | Parade |
|---|---|
| Une condition non littérale laisse Rollup émettre les chunks IA | Règle §3.3 + contrôle du bundle bloquant (§5) |
| Hooks appelés conditionnellement | Aucun : les hooks sont toujours appelés, seul l'argument `userId` passe à `null` |
| Oubli de `VITE_EDITION=full` en local → l'auteur croit avoir perdu des fonctions | Défaut documenté ici et dans `CLAUDE.md` |
| Edge function IA toujours appelable en production | Traité au chantier Sécurité (§8.1), prérequis au lancement |
