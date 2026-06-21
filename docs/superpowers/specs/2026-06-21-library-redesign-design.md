# Refonte de la page Bibliothèque — hub CV & ATS

## Contexte

La page Bibliothèque (`/library`) affiche aujourd'hui des expériences/formations/compétences/centres d'intérêt sous forme de cartes filtrables, avec un import de CV (`CVImporter.tsx`) qui parse un PDF/DOCX et extrait des données vers la table `Experience` via l'IA, sans jamais conserver le fichier original ni produire de score ATS.

L'objectif est d'en faire un hub carrière : CV importés visibles et gérables, analyses ATS réelles, et réutilisation des éléments extraits — en suivant fidèlement la maquette fournie (capture d'écran), qui est la cible exacte de ce chantier. Le texte de vision plus large fourni par l'utilisateur (versioning poussé, dossiers de candidature, archivage avancé, recherche globale, drawer latéral, workflow d'import visible en 3 étapes, comparaison ligne à ligne) est mis en **backlog** pour des chantiers futurs — seuls les éléments visibles dans la maquette sont dans le périmètre.

## Périmètre

**Dans le périmètre (= maquette) :**
- Header avec 3 actions : Importer un CV, Comparer 2 CV, Nouvelle analyse
- 4 cartes statistiques (CV importés, Analyses réalisées, Score ATS moyen, Mots-clés manquants) — valeurs réelles, sans fausses tendances temporelles
- Section "Mes CV" — liste des CV importés et stockés, avec score ATS, statut, actions
- Section "Analyses ATS récentes" — historique des analyses, avec actions Voir/Optimiser/Associer
- Section "Éléments de bibliothèque" — tableau à onglets (Expériences/Formations/Compétences/Centres d'intérêt), remplaçant les cartes actuelles
- Panneau "Suggestions IA (Béta)" avec génération à la demande
- Comparaison simple (métadonnées côte à côte) de 2 CV

**Hors périmètre (backlog) :** drawer latéral de détail, recherche globale multi-types, filtres avancés (Archives, Suggestions IA en filtre), dossiers de candidature, workflow d'import visible en 3 étapes (le flux actuel d'import reste un modal, juste enrichi), versioning de CV, détection de doublons, tags personnalisés, comparaison texte ligne à ligne.

## Modèle de données

### Nouvelle table `cv_documents`

```sql
create table public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size integer not null,
  status text not null default 'to_review' check (status in ('active', 'to_review', 'archived')),
  ats_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_documents enable row level security;

create policy "cv_documents_owner_all" on public.cv_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Nouvelle table `ats_analyses`

```sql
create table public.ats_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null references public.cv_documents(id) on delete cascade,
  application_id text, -- référence informelle vers "Application".id (legacy, type text, pas de FK cross-schema)
  title text not null,
  job_description text,
  score integer not null,
  missing_keywords text[] not null default '{}',
  recommendations text,
  created_at timestamptz not null default now()
);

alter table public.ats_analyses enable row level security;

create policy "ats_analyses_owner_all" on public.ats_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Modification de `"Experience"`

```sql
alter table public."Experience"
  add column "sourceCvId" uuid references public.cv_documents(id) on delete set null;
```

`sourceCvId` est renseigné automatiquement quand une expérience est validée depuis un import de CV ; `null` pour une saisie manuelle (affiché "Saisie manuelle" dans la colonne Source).

### Storage

Nouveau bucket privé `cv-documents`. Convention de chemin : `{user_id}/{cv_id}/{nom_fichier}`. Policies RLS sur `storage.objects` calquées sur le bucket `avatars` existant, restreintes au dossier `{user_id}` du propriétaire (lecture, écriture, suppression).

## Composants & hooks

### Nouveaux hooks (`src/hooks/`)
- `useCvDocuments(userId)` — liste les CV de l'utilisateur, upload (storage + insert), `updateStatus()`, `deleteCv()` (supprime le fichier storage + la ligne), `getSignedUrl()` pour Ouvrir/Télécharger.
- `useAtsAnalyses(userId)` — liste les analyses (triées par date desc), `createAnalysis()` (appelle l'IA puis insère), `generateRecommendations()` (remplit `recommendations` à la demande), `associateToApplication()`.

### Nouvelles fonctions IA (`src/lib/ai.ts`)
- `analyzeCvAts({ cvText, jobTitle?, jobDescription? }): Promise<{ score: number; missingKeywords: string[]; recommendations: string }>` — via `generateStructuredData`.
- `generateLibrarySuggestions({ experiences, cvDocuments }): Promise<string[]>` — 2 à 3 suggestions textuelles, pas de persistance.

### Nouveaux composants (`src/components/library/`)
- `ScoreRing.tsx` — badge circulaire de score réutilisable (CV, analyse ATS).
- `CvCard.tsx` — ligne "Mes CV" : icône fichier, nom, date, `ScoreRing`, badge de statut, actions (Ouvrir, Télécharger, menu `…` : Réanalyser / Marquer actif / Archiver / Supprimer).
- `AtsAnalysisRow.tsx` — ligne "Analyses ATS récentes" : titre, CV utilisé, date, `ScoreRing`, nombre de mots-clés manquants, actions (Voir, Optimiser, Associer).
- `NewAtsAnalysisModal.tsx` — sélection d'un CV existant + champ optionnel titre/description de poste → appelle `analyzeCvAts` → insère via `useAtsAnalyses`.
- `AtsAnalysisDetailModal.tsx` — mode "Voir" (lecture) et mode "Optimiser" (génère `recommendations` à la volée si absent, puis les affiche).
- `AssociateAnalysisModal.tsx` — liste des `Application` de l'utilisateur (company/position), sélection → `associateToApplication()`.
- `CompareCvModal.tsx` — deux sélecteurs de CV → tableau comparatif (score, nb expériences liées via `sourceCvId`, nb compétences détectées, statut, date d'import).
- `LibrarySuggestionsPanel.tsx` — bouton "Lancer une analyse IA" → appelle `generateLibrarySuggestions`, affiche les puces, état de chargement/erreur.

### Composants modifiés
- `CVImporter.tsx` : après validation de l'utilisateur, upload du fichier original vers `cv-documents`, création de la ligne `cv_documents` (`status: to_review`), puis `sourceCvId` posé sur chaque expérience insérée.
- `LibraryPage.tsx` : réécrit pour suivre la maquette (header à 3 actions, 4 stat cards réelles, "Mes CV", "Analyses ATS récentes", tableau "Éléments de bibliothèque" à onglets, panneau Suggestions IA). Les onglets et le filtrage existants (recherche texte, dates, type) sont conservés mais le rendu passe de cartes à un tableau (Élément | Type | Source | Dernière utilisation | Actions).

## Flux détaillés

1. **Importer un CV** : modal 3 étapes existant conservé (upload → extraction → validation), enrichi pour stocker le fichier et créer `cv_documents`.
2. **Nouvelle analyse** : voir composants ci-dessus. Met aussi à jour `cv_documents.ats_score` du CV choisi avec le score obtenu.
3. **Voir / Optimiser** : `AtsAnalysisDetailModal`, recommandations IA générées à la demande et mises en cache sur la ligne.
4. **Associer** : lie une analyse à une candidature existante (`Application.id`).
5. **Comparer 2 CV** : comparaison de métadonnées uniquement, pas de diff texte.
6. **Statut CV** : `to_review` à l'import (auto), bascule manuelle `active`/`archived` via le menu `…` de `CvCard`. Plusieurs CV `active` possibles simultanément.
7. **Suppression d'un CV** : supprime le fichier storage + la ligne `cv_documents` ; les expériences liées passent `sourceCvId = null` (pas de cascade sur `Experience`).
8. **Suggestions IA** : génération à la demande, sans persistance, remplace l'affichage précédent à chaque clic.

## Design visuel

Réutilisation des tokens CSS existants (`--color-primary: #003B5C`, `--color-accent: #007EA7`, `--color-border: #D8E2EA`, `--color-muted: #64748B`), déjà très proches de la palette demandée. Ajout des tokens manquants `--color-positive: #0EA5A3` et `--color-danger: #EF4444` si absents. Pas de nouveau thème parallèle.

## Tests

- Tests unitaires Vitest pour `useCvDocuments` et `useAtsAnalyses` (CRUD, gestion des statuts).
- Test de `analyzeCvAts` et `generateLibrarySuggestions` avec mock de l'appel IA.
- Test de composant pour `CvCard` (rendu des statuts/actions) et `AtsAnalysisRow`.
- Pas de test e2e (cohérent avec la politique du projet pour le MVP).
