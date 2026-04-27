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

## 📐 Schéma de base de données (PostgreSQL via Supabase)

```sql
-- ============================================
-- USERS (géré par Supabase Auth, étendu ici)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  title TEXT,                    -- "Développeur Full-Stack", etc.
  summary TEXT,                  -- résumé/accroche pour le CV
  linkedin_url TEXT,
  portfolio_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EXPÉRIENCES PROFESSIONNELLES
-- ============================================
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,                 -- NULL = poste actuel
  description TEXT,              -- description libre
  tags TEXT[] DEFAULT '{}',      -- tags de compétences liées
  is_current BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FORMATIONS
-- ============================================
CREATE TABLE educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMPÉTENCES
-- ============================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,                 -- "Technique", "Soft skill", "Langue", etc.
  level TEXT,                    -- "Débutant", "Intermédiaire", "Avancé", "Expert"
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CANDIDATURES
-- ============================================
CREATE TYPE application_status AS ENUM (
  'wishlist',        -- à postuler
  'applied',         -- candidature envoyée
  'phone_screen',    -- entretien téléphonique
  'interview',       -- entretien
  'technical_test',  -- test technique
  'offer',           -- offre reçue
  'accepted',        -- accepté
  'rejected',        -- refusé
  'withdrawn'        -- retiré
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  status application_status DEFAULT 'wishlist',
  salary_min INT,
  salary_max INT,
  location TEXT,
  remote_type TEXT,              -- "remote", "hybrid", "onsite"
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  applied_at DATE,
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ÉVÉNEMENTS / TIMELINE D'UNE CANDIDATURE
-- ============================================
CREATE TABLE application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,      -- "applied", "email_sent", "interview", "feedback", etc.
  event_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CV GÉNÉRÉS (construction dynamique)
-- ============================================
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,           -- "CV pour Poste X chez Y"
  selected_experiences UUID[] DEFAULT '{}',   -- IDs des expériences choisies
  selected_educations UUID[] DEFAULT '{}',
  selected_skills UUID[] DEFAULT '{}',
  custom_summary TEXT,           -- résumé adapté au poste
  template TEXT DEFAULT 'classic', -- nom du template de CV
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY (critique !)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Politique : chaque user ne voit que SES données
CREATE POLICY "Users can CRUD own data" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own experiences" ON experiences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own educations" ON educations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own skills" ON skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own events" ON application_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own resumes" ON resumes
  FOR ALL USING (auth.uid() = user_id);
```

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
