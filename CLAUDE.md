# CLAUDE.md — Tracker Candidature

## 🎯 Vision du projet

Plateforme SaaS de **gestion de candidatures et construction de CV dynamique**.
L'utilisateur suit ses candidatures (statut, retours, relances) et construit un CV sur-mesure pour chaque poste en sélectionnant les expériences pertinentes depuis sa base personnelle.

---

## 📦 Prototype existant (Claude Design)

Un prototype HTML/JSX complet existe dans `candidature-prototype/`. Il contient :

### Fichiers sources
- `Candidature.html` — Point d'entrée, charge React via CDN + Babel
- `data.jsx` — Données statiques (APPLICATIONS, EXPERIENCES, I18N fr/en)
- `icons.jsx` — Composant `<Icon>` SVG avec ~25 icônes
- `sidebar.jsx` — Navigation latérale avec sections + user footer
- `dashboard.jsx` — Dashboard Kanban (CompanyLogo, AppCard, stats, pipeline, semaine)
- `cv.jsx` — **CV Builder complet** : 6 templates (ATS, Classic, Modern, Créatif, Compact, Chronologie), sélecteur de blocs avec scores, onglets Contenu/Profil/Sections/ATS, check ATS, preview live
- `screens.jsx` — Library (bibliothèque d'expériences), Detail (page candidature avec timeline/notes), Onboarding (flow 4 étapes)
- `calendar.jsx` — Calendrier mois + vue jour avec créneaux horaires
- `styles.css` — Design system complet (~1360 lignes)

### Design system existant (à conserver)
- **4 palettes** : cream (défaut), sage, rose, denim — via `data-palette` sur `<html>`
- **Typographie** : Calibri/Carlito (ui+display), Consolas (mono)
- **Tons chauds** : fond crème `#FAF6F0`, accents terracotta `#C4673B`
- **Variables CSS** : `--bg`, `--bg-raised`, `--ink`, `--accent`, `--line`, etc.
- **Composants UI** : `.btn`, `.card`, `.chip`, `.stat`, `.kanban`, `.app-card`, etc.

### Fonctionnalités du prototype (statiques, à rendre dynamiques)
1. **Dashboard/Kanban** — 4 colonnes (À postuler → Envoyé → Entretien → Offre), cartes avec score match, deadlines, semaine à venir
2. **CV Builder** — Sélection d'expériences par checkbox + score de pertinence, 6 templates de preview, vérification ATS, gestion photo, sections activables
3. **Bibliothèque** — Liste d'expériences filtrables (type, tags, période), import LinkedIn prévu
4. **Détail candidature** — Timeline, notes, onglets (Aperçu/Notes/Emails/Tâches/CV)
5. **Calendrier** — Vue mois interactive + vue jour avec événements colorés par type
6. **Onboarding** — 4 étapes : bienvenue → profil → type de recherche → import
7. **i18n** — FR/EN déjà en place via objet `I18N`
8. **Tweaks** — Panel de personnalisation palette + style CV

### Ce qui doit changer pour la prod
- Remplacer les données hardcodées par des hooks Supabase
- Remplacer `setScreen()` par React Router
- Remplacer `localStorage` par Supabase Auth + persistence
- Ajouter TypeScript strict
- Migrer le CSS vers Tailwind progressivement (garder les variables CSS custom)
- Ajouter le drag & drop Kanban (@dnd-kit)
- Ajouter l'export PDF (@react-pdf/renderer)

---

## 🏗️ Architecture technique

### Stack

| Couche         | Technologie                                      |
| -------------- | ------------------------------------------------ |
| **Frontend**   | React 18 + TypeScript + Vite                     |
| **UI/Style**   | Tailwind CSS 3 + Shadcn/UI + Framer Motion       |
| **Routing**    | React Router v6                                  |
| **State**      | Zustand (client) + React Query / TanStack Query  |
| **Backend**    | Supabase (Auth + PostgreSQL + Storage + Realtime) |
| **ORM/Client** | Supabase JS SDK v2                               |
| **PDF Export**  | React-PDF (@react-pdf/renderer)                  |
| **Deploy**     | Vercel (frontend) + Supabase Cloud (backend)     |

### Pourquoi Supabase ?

- Auth intégrée (email/password, OAuth Google/GitHub)
- Base PostgreSQL managée avec Row Level Security (RLS)
- Sync temps réel natif → données accessibles sur tous les appareils
- Storage pour les uploads (photos de profil, pièces jointes)
- Gratuit pour commencer, scalable ensuite

---

## 📐 Schéma de base de données (état réel, vérifié le 2026-06-19)

> ⚠️ Le schéma ci-dessous est celui **réellement déployé** sur Supabase (vérifié via
> `mcp__supabase__list_tables` + `pg_policies`). Il diverge du schéma snake_case
> qui était documenté ici auparavant (`profiles`, `educations`, `skills`,
> `application_events` n'ont **jamais existé** en base — ne pas écrire de code
> qui s'appuie sur ces noms). L'app a hérité d'un schéma CamelCase de type
> Prisma (tables citées entre guillemets) pour le cœur métier, plus quelques
> tables snake_case ajoutées plus récemment directement via migrations
> Supabase. **Toujours vérifier l'état live avant de coder** (`list_tables`),
> ce document peut se désynchroniser.

### Tables actives (utilisées par l'app)

| Table | Clé | RLS | Policy |
|---|---|---|---|
| `"Application"` | `id text`, `userId text` | ✅ | `userId = auth.uid()::text` (ALL) |
| `"Experience"` | `id text`, `userId text` | ✅ | `userId = auth.uid()::text` (ALL) |
| `"TimelineStep"` | `id text`, `applicationId text` | ✅ | via sous-requête sur `Application.userId` (ALL) |
| `"OrgLogo"` | `id text`, `userId text` | ✅ | `userId = auth.uid()::text` (ALL) |
| `"Profile"` | `id uuid` → `auth.users.id` | ✅ | `auth.uid() = id` (ALL) |
| `tasks` | `id uuid`, `user_id uuid` → `auth.users.id` | ✅ | `auth.uid() = user_id` (ALL) |
| `user_goals` | `id uuid`, `user_id uuid` → `auth.users.id` | ✅ | `auth.uid() = user_id` (ALL) — **remplace `"UserGoal"` (legacy, voir plus bas)** |
| `company_domains` | `id uuid` (pas de `user_id`, catalogue partagé) | ✅ | SELECT public ; INSERT libre (authenticated) ; UPDATE limité aux lignes dont `domain` est vide (durci le 2026-06-19, voir `supabase/migrations/20260619030000_harden_company_domains_and_resume_rls.sql`) |

`"Application"` a un FK `resumeId → "Resume".id` et `userId → "User".id`, mais ces deux tables cibles sont **legacy** (voir ci-dessous) — ne pas s'appuyer sur elles pour de nouvelles features.

### Tables legacy / orphelines (RLS activé, aucune policy = deny-all côté client, mais code mort)

Le CV builder a été retiré (commit `0e5cbe7`), ce qui a laissé ces tables sans consommateur :

- `"User"` (1 ligne) — table Prisma pré-Supabase-Auth, contient encore une colonne `password` (résidu d'un ancien système d'auth, jamais utilisé par l'app actuelle qui passe par Supabase Auth). Ne pas réutiliser ; candidate à la suppression après vérification qu'aucun script externe n'en dépend.
- `"UserGoal"` (1 ligne) — doublon legacy de `user_goals` (snake_case). Les hooks (`useGoals.ts`) utilisent `user_goals`, pas `"UserGoal"`.
- `"Resume"` (1 ligne) — table du CV builder retiré. Une policy CRUD propriétaire (`userId = auth.uid()::text`) a été ajoutée le 2026-06-19 par défense en profondeur, mais aucun code client n'écrit dans cette table actuellement.
- `"JobOffer"` (0 ligne) — jamais consommé côté client (le composant `JobOfferImporter.tsx` ne persiste rien dans cette table).
- `_prisma_migrations` — table technique de l'ancien tooling Prisma, sans rapport avec les migrations Supabase actuelles (`supabase/migrations/`).

### Sécurité — points vérifiés via `mcp__supabase__get_advisors`

- ✅ Corrigé (2026-06-19) : `company_domains` permettait l'écrasement de n'importe quelle entrée par n'importe quel utilisateur authentifié (`USING (true)` sur UPDATE).
- ✅ Corrigé (2026-06-19) : `"Resume"` avait RLS activé sans aucune policy.
- ⚠️ À faire manuellement dans le dashboard Supabase (pas possible via migration SQL) : activer **Leaked Password Protection** (Authentication → Policies).
- ℹ️ Non urgent (deny-all déjà en place) : nettoyer/supprimer `"User"`, `"UserGoal"`, `"JobOffer"`, `_prisma_migrations` si confirmé inutilisés.

---

## 📂 Structure du projet

```
jobtracker-pro/
├── CLAUDE.md
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.local                    # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                 # Tailwind directives + fonts + CSS vars
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Client Supabase singleton
│   │   ├── database.types.ts     # Types auto-générés par Supabase CLI
│   │   └── utils.ts              # Helpers (cn, formatDate, etc.)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Hook auth (login, signup, logout, session)
│   │   ├── useApplications.ts    # CRUD candidatures via React Query
│   │   ├── useExperiences.ts     # CRUD expériences
│   │   ├── useEducations.ts
│   │   ├── useSkills.ts
│   │   ├── useResumes.ts
│   │   └── useProfile.ts
│   │
│   ├── store/
│   │   └── uiStore.ts            # État UI (sidebar, modales, filtres)
│   │
│   ├── components/
│   │   ├── ui/                   # Composants Shadcn/UI réutilisables
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # Layout principal (sidebar + content)
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── AuthGuard.tsx     # Route protégée
│   │   │   └── OAuthButtons.tsx
│   │   │
│   │   ├── applications/
│   │   │   ├── ApplicationBoard.tsx   # Vue Kanban
│   │   │   ├── ApplicationCard.tsx
│   │   │   ├── ApplicationTable.tsx   # Vue tableau
│   │   │   ├── ApplicationForm.tsx    # Création/édition
│   │   │   ├── ApplicationDetail.tsx  # Page détail + timeline
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ApplicationFilters.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── ExperienceList.tsx
│   │   │   ├── ExperienceForm.tsx
│   │   │   ├── EducationList.tsx
│   │   │   ├── EducationForm.tsx
│   │   │   ├── SkillManager.tsx
│   │   │   └── SkillBadge.tsx
│   │   │
│   │   ├── resume/
│   │   │   ├── ResumeBuilder.tsx      # Sélecteur d'expériences
│   │   │   ├── ResumePreview.tsx      # Prévisualisation live
│   │   │   ├── ResumePDFExport.tsx    # Export PDF
│   │   │   ├── TemplateSelector.tsx
│   │   │   └── templates/
│   │   │       ├── ClassicTemplate.tsx
│   │   │       ├── ModernTemplate.tsx
│   │   │       └── MinimalTemplate.tsx
│   │   │
│   │   └── dashboard/
│   │       ├── StatsOverview.tsx
│   │       ├── RecentActivity.tsx
│   │       └── ApplicationChart.tsx
│   │
│   └── pages/
│       ├── LoginPage.tsx
│       ├── SignupPage.tsx
│       ├── DashboardPage.tsx
│       ├── ApplicationsPage.tsx
│       ├── ApplicationDetailPage.tsx
│       ├── ProfilePage.tsx
│       ├── ResumeBuilderPage.tsx
│       └── SettingsPage.tsx
```

---

## 🎨 Direction design

- **Thème** : Dark mode par défaut, tonalités slate/zinc avec accents verts émeraude (#10b981)
- **Typo** : "Cabinet Grotesk" (titres) + "Satoshi" (body) — via Fontshare
- **Mood** : Professionnel mais pas corporate. Clean, espacé, micro-interactions soignées
- **Kanban** : Drag & drop avec @dnd-kit pour le suivi des candidatures
- **Responsive** : Mobile-first, bottom nav sur mobile

---

## ⚙️ Conventions de code

### Générales
- TypeScript strict (`strict: true`) — jamais de `any`
- Nommage : PascalCase composants, camelCase fonctions/variables, UPPER_SNAKE constantes
- Un composant = un fichier. Max ~200 lignes par fichier
- Pas de `console.log` en prod — utiliser un logger si besoin

### React
- Functional components uniquement
- Custom hooks pour toute logique réutilisable (préfixe `use`)
- Props typées avec `interface` (pas `type` pour les props)
- Éviter les props drilling > 2 niveaux → utiliser Zustand ou Context

### Supabase
- Toujours utiliser les types générés (`database.types.ts`)
- Toutes les requêtes passent par des hooks custom (jamais d'appel direct dans les composants)
- Gérer les erreurs Supabase avec des messages user-friendly
- RLS activé sur TOUTES les tables — jamais de bypass

### CSS / Tailwind
- Utiliser `cn()` (clsx + tailwind-merge) pour les classes conditionnelles
- CSS variables pour les couleurs du thème dans `index.css`
- Pas de styles inline sauf cas exceptionnels
- Animations via Framer Motion ou classes Tailwind `animate-*`

### Git
- Commits conventionnels : `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Branches : `feature/nom`, `fix/nom`, `refactor/nom`
- PR avec description claire

---

## 🔐 Sécurité

- Variables d'env dans `.env.local` (jamais commitées)
- Supabase Anon Key côté client (sécurisé par RLS)
- Service Role Key JAMAIS côté client
- Validation des inputs côté client (Zod) ET côté serveur (RLS + contraintes SQL)
- Sanitization des données avant affichage

---

## 🧪 Tests

- Vitest pour les tests unitaires
- React Testing Library pour les composants
- Tests des hooks custom isolés
- Pas de test e2e pour le MVP, mais prévu (Playwright)

---

## 📝 Notes pour Claude Code

- Toujours lire ce fichier avant de commencer une tâche
- Si une migration SQL est nécessaire, la créer dans `supabase/migrations/`
- Préférer les modifications incrémentales aux réécritures complètes
- Tester chaque fonctionnalité dans le navigateur avant de valider
- Si un choix d'architecture est ambigu, demander avant d'implémenter
- Ne jamais supprimer de code sans comprendre pourquoi il existe
- Commenter les décisions non évidentes avec `// WHY: ...`
