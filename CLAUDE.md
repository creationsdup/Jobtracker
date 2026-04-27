# CLAUDE.md — JobTracker

## Vision du projet

Application web de **suivi de candidatures** avec timeline, kanban, et analyse d'offres via IA.
L'utilisateur crée un compte, ajoute ses candidatures, suit leur progression via une timeline visuelle,
et peut analyser automatiquement des offres d'emploi avec Claude API.

---

## Stack technique

| Couche      | Technologie                                |
| ----------- | ------------------------------------------ |
| Frontend    | React 18 + TypeScript + Vite               |
| Style       | Tailwind CSS v3                            |
| Routing     | React Router v6                            |
| State       | Zustand                                    |
| Data        | TanStack Query (React Query v5)            |
| Backend     | Supabase (Auth + PostgreSQL + RLS)         |
| Client DB   | @supabase/supabase-js v2                   |
| IA          | Claude API (analyse d'offres)              |
| PDF         | @react-pdf/renderer                        |

---

## Structure des dossiers

```
src/
├── components/
│   ├── ui/              # Composants réutilisables (Button, Modal, Badge, etc.)
│   ├── layout/          # Sidebar, Header, Layout wrapper
│   ├── applications/    # Cards, KanbanBoard, ApplicationList
│   └── timeline/        # TimelineView, TimelineStep, AddStepModal
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ApplicationsPage.tsx
│   ├── ApplicationDetailPage.tsx
│   └── SettingsPage.tsx
├── lib/
│   ├── supabase.ts      # Client Supabase singleton
│   └── claude.ts        # Appels Claude API
├── store/
│   └── useAppStore.ts   # Zustand store global
├── hooks/
│   ├── useApplications.ts
│   ├── useTimeline.ts
│   └── useAuth.ts
└── types/
    └── index.ts         # Tous les types TypeScript
```

---

## Types TypeScript (src/types/index.ts)

```typescript
export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location?: string;
  contract_type?: string;
  salary?: string;
  remote?: 'none' | 'partial' | 'full';
  url?: string;
  description?: string;
  status: ApplicationStatus;
  company_logo?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineStep {
  id: string;
  application_id: string;
  user_id: string;
  title: string;
  notes?: string;
  date: string;
  time?: string;
  status: StepStatus;
  step_type:
    | 'applied'
    | 'confirmation'
    | 'interview_hr'
    | 'interview_manager'
    | 'test'
    | 'offer'
    | 'rejected'
    | 'custom';
  created_at: string;
}
```

---

## Schéma SQL Supabase

Exécuter dans l'éditeur SQL de Supabase :

```sql
-- Enum statuts
CREATE TYPE application_status AS ENUM (
  'saved', 'applied', 'interview', 'offer', 'rejected'
);

CREATE TYPE step_status AS ENUM ('done', 'current', 'upcoming');

CREATE TYPE step_type AS ENUM (
  'applied', 'confirmation', 'interview_hr',
  'interview_manager', 'test', 'offer', 'rejected', 'custom'
);

-- Table candidatures
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  contract_type TEXT,
  salary TEXT,
  remote TEXT DEFAULT 'none',
  url TEXT,
  description TEXT,
  status application_status DEFAULT 'saved',
  company_logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table étapes timeline
CREATE TABLE timeline_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT,
  status step_status DEFAULT 'upcoming',
  step_type step_type DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_steps_application ON timeline_steps(application_id);
CREATE INDEX idx_steps_user ON timeline_steps(user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_steps" ON timeline_steps
  FOR ALL USING (auth.uid() = user_id);
```

---

## Variables d'environnement

Fichier `.env` à la racine du projet :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxx
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

Ne jamais committer `.env`. Ajouter au `.gitignore`.

---

## Client Supabase (src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Routes de l'application

| Route                    | Page                   | Auth requise |
| ------------------------ | ---------------------- | ------------ |
| `/`                      | Redirect login/dashboard | —          |
| `/login`                 | LoginPage              | Non          |
| `/dashboard`             | DashboardPage          | Oui          |
| `/applications`          | ApplicationsPage       | Oui          |
| `/applications/:id`      | ApplicationDetailPage  | Oui          |
| `/settings`              | SettingsPage           | Oui          |

---

## Statuts et couleurs

| Statut     | Label FR         | Couleur Tailwind          |
| ---------- | ---------------- | ------------------------- |
| saved      | Sauvegardée      | `bg-gray-100 text-gray-700`   |
| applied    | Postulée         | `bg-blue-100 text-blue-700`   |
| interview  | Entretien        | `bg-orange-100 text-orange-700` |
| offer      | Offre reçue      | `bg-green-100 text-green-700` |
| rejected   | Refusée          | `bg-red-100 text-red-700`     |

---

## Étapes timeline prédéfinies

Quand l'utilisateur ajoute une étape, proposer ces types avec mise à jour automatique du statut global :

| step_type         | Label FR                 | Nouveau statut global |
| ----------------- | ------------------------ | --------------------- |
| applied           | Candidature envoyée      | applied               |
| confirmation      | Accusé de réception      | applied               |
| interview_hr      | Entretien RH             | interview             |
| interview_manager | Entretien manager        | interview             |
| test              | Test / Cas pratique      | interview             |
| offer             | Offre reçue              | offer                 |
| rejected          | Refus                    | rejected              |
| custom            | Étape libre              | (inchangé)            |

---

## Règles de développement

- Toujours utiliser TypeScript strict, pas de `any`
- Chaque appel Supabase dans un hook dédié (`src/hooks/`)
- Gérer les états loading et error sur chaque fetch
- Les composants UI dans `src/components/ui/` sont purement visuels, sans logique métier
- Nommer les composants en PascalCase, les hooks en camelCase avec préfixe `use`
- Mobile-first : toutes les vues doivent fonctionner sur mobile
- Ne jamais exposer la clé API Anthropic côté client en production (utiliser une Edge Function Supabase)

---

## Ordre de développement

1. Auth (login / signup / logout) + ProtectedRoute
2. Layout de base (sidebar + header)
3. Liste des candidatures + création
4. Vue détail candidature + timeline
5. Vue Kanban avec drag & drop
6. Analyse d'offre via Claude API
7. Export PDF
