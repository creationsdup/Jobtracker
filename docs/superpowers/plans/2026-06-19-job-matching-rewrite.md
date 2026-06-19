# Job Matching Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire goal-matching scoring system with `calculateJobMatch()` — a 7-category, weighted, explainable match score — and rebuild the Objectifs page and per-application score UI around it.

**Architecture:** Pure scoring logic lives in `src/lib/jobMatching.ts` (no React, no Supabase), typed by `src/types/jobMatching.ts`. The goal model (`UserGoal`) gains new fields via an additive+rename Supabase migration. `useGoals.ts` keeps only data fetch/write — all scoring functions move out. Two new UI components (`MatchScoreBadge`, `MatchDetailsModal`) replace `GoalBadge`. `GoalsPage.tsx` is rebuilt with 5 cards per spec.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + RLS), Tailwind, Vitest (newly added for this work — no test runner existed before).

## Global Constraints

- No new column on `Application` / table `"Application"` — matching reads `position`, `company`, `location`, `contractType`, `notes` only.
- No candidate data deleted; migration is additive/rename-only, never drops rows.
- Score must never be exactly 0 *because* a field is missing — missing data always maps to a neutral 50 + an entry in `missingData`.
- Weights are fixed: title 25%, contract 15%, location 15%, company 15%, sector 10%, keywords 15%, experience 5% (sum 100%).
- Levels: Très cohérent ≥75, Cohérent ≥60, Moyen ≥45, Peu cohérent ≥30, Hors cible <30.
- "Priorités de scoring" is a free-text, informational field only — it never changes the weights.
- `npm run build` must pass with zero TypeScript errors at the end.

---

### Task 0: Add Vitest test runner

No test runner exists in this project yet (`package.json` has no `test` script, no `vitest` dependency). This is required before any TDD step below can run.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `npm test` command runnable by every later task's test steps.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: adds `vitest` to `devDependencies` in `package.json`.

- [ ] **Step 2: Add a vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add the test script**

Modify `package.json` — in `"scripts"`, add a `test` entry right after `"lint"`:

```json
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run",
```

- [ ] **Step 4: Verify it runs with no test files**

Run: `npm test`
Expected: vitest starts and reports "No test files found" (exit code may be non-zero — that's fine, it proves the runner works). If it errors on missing config/deps instead, fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 1: Extend and rename `user_goals` columns

**Files:**
- Create: `supabase/migrations/20260619040000_extend_user_goals_for_job_matching.sql`

**Interfaces:**
- Produces: columns `target_title`, `target_roles` (renamed from `target_positions`), `locations` (renamed from `zones`), `sectors`, `keywords_wanted`, `keywords_excluded`, `experience_level`, `scoring_priorities` on `user_goals`. `contract_types`, `target_companies`, `target_date`, `personal_target` unchanged.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260619040000_extend_user_goals_for_job_matching.sql`:

```sql
-- Extends user_goals for the job-matching rewrite: new criteria (sectors,
-- keywords, experience level, free-text title/priorities), and renames two
-- existing columns for clarity. Additive + rename only — no data is dropped.

alter table user_goals
  add column if not exists target_title text,
  add column if not exists sectors text[] default '{}',
  add column if not exists keywords_wanted text[] default '{}',
  add column if not exists keywords_excluded text[] default '{}',
  add column if not exists experience_level text[] default '{}',
  add column if not exists scoring_priorities text;

alter table user_goals rename column target_positions to target_roles;
alter table user_goals rename column zones to locations;
```

- [ ] **Step 2: Apply the migration locally and verify columns**

Run: `mcp__supabase__apply_migration` with `name: "extend_user_goals_for_job_matching"` and the SQL above (or, if working purely through the Supabase CLI locally, `supabase migration up`). Then run `mcp__supabase__list_tables` (or `select * from user_goals limit 1;` via `mcp__supabase__execute_sql`) and confirm the column list is exactly: `id, user_id, type, contract_types, target_date, personal_target, target_companies, target_roles, locations, target_title, sectors, keywords_wanted, keywords_excluded, experience_level, scoring_priorities, created_at, updated_at`.

Expected: query succeeds, no rows lost (row count unchanged from before the migration).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260619040000_extend_user_goals_for_job_matching.sql
git commit -m "feat(db): extend user_goals with sectors/keywords/experience/title fields"
```

---

### Task 2: Update `UserGoal` type and `useGoals.ts` data hook

**Files:**
- Modify: `src/lib/types.ts:67-79`
- Modify: `src/hooks/useGoals.ts` (entire file — strips scoring, updates field names)

**Interfaces:**
- Consumes: nothing new.
- Produces: `UserGoal` (new shape below), `GoalUpdate` (matching partial), `useGoals(userId, applications?)` returning `{ goal, loading, saving, saveGoal, refetch }` — **no longer returns `alignment`** (computed by the new matching system in later tasks, not the data hook).

- [ ] **Step 1: Update the `UserGoal` interface**

In `src/lib/types.ts`, replace lines 65-79:

```typescript
// ─── User Goals ──────────────────────────────────────────────────────────────

export interface UserGoal {
  id: string
  user_id: string
  target_title: string | null
  target_roles: string[]
  contract_types: string[]
  locations: string[]
  target_companies: string[]
  sectors: string[]
  keywords_wanted: string[]
  keywords_excluded: string[]
  experience_level: string[]
  scoring_priorities: string | null
  target_date: string | null
  personal_target: number | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Rewrite `useGoals.ts` to drop scoring and use the new field names**

Replace the entire content of `src/hooks/useGoals.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserGoal } from '@/lib/types'

export interface GoalUpdate {
  target_title?: string | null
  target_roles?: string[]
  contract_types?: string[]
  locations?: string[]
  target_companies?: string[]
  sectors?: string[]
  keywords_wanted?: string[]
  keywords_excluded?: string[]
  experience_level?: string[]
  scoring_priorities?: string | null
  target_date?: string | null
  personal_target?: number | null
}

export function useGoals(userId: string | null) {
  const [goal, setGoal] = useState<UserGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchGoal = useCallback(async () => {
    if (!userId) {
      setGoal(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setGoal(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  const saveGoal = useCallback(async (updates: GoalUpdate): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    setSaving(true)

    const payload = goal
      ? { ...goal, ...updates, updated_at: new Date().toISOString() }
      : {
          user_id: userId,
          target_title: updates.target_title ?? null,
          target_roles: updates.target_roles ?? [],
          contract_types: updates.contract_types ?? [],
          locations: updates.locations ?? [],
          target_companies: updates.target_companies ?? [],
          sectors: updates.sectors ?? [],
          keywords_wanted: updates.keywords_wanted ?? [],
          keywords_excluded: updates.keywords_excluded ?? [],
          experience_level: updates.experience_level ?? [],
          scoring_priorities: updates.scoring_priorities ?? null,
          target_date: updates.target_date ?? null,
          personal_target: updates.personal_target ?? 12,
        }

    const { data, error } = await supabase
      .from('user_goals')
      .upsert(payload)
      .select()
      .single()

    setSaving(false)
    if (error) return error.message
    setGoal(data)
    return null
  }, [goal, userId])

  return { goal, loading, saving, saveGoal, refetch: fetchGoal }
}
```

Note the `useGoals` signature drops the `applications` parameter — it no longer computes alignment. This is intentionally a breaking change to the hook's call sites; later tasks (9-12) update every caller.

- [ ] **Step 3: Confirm the project still type-checks for this file in isolation**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "useGoals|types.ts" || true`
Expected: errors will appear for every consumer that still imports the removed `computeAppScore`/`computeAppScoreBreakdown`/`computeAlignment`/`GoalAlignment`/`ScoreCriterion` or passes `applications` to `useGoals`, and for `GoalsPage.tsx`/`App.tsx` referencing old `UserGoal` field names. That is expected at this point in the plan — those call sites are fixed in Tasks 9-12. This step is just a checkpoint, not a gate.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/hooks/useGoals.ts
git commit -m "refactor: strip scoring from useGoals, rename goal fields for job-matching rewrite"
```

---

### Task 3: Create `src/types/jobMatching.ts`

**Files:**
- Create: `src/types/jobMatching.ts`

**Interfaces:**
- Produces: `JobMatchInput`, `MatchLevel`, `MatchConfidence`, `CategoryScores`, `MatchResult` — used by every task from here on.

- [ ] **Step 1: Write the types file**

Create `src/types/jobMatching.ts`:

```typescript
// Generic view of a job offer for matching purposes. Decoupled from the
// `Application` DB shape so the scoring logic can be unit-tested with plain
// objects (see the test scenarios in jobMatching.test.ts) and reused if a
// non-Application source of offers is added later.
export interface JobMatchInput {
  title: string
  company: string
  location: string | null
  contract: string | null
  /** Free text aggregating description/notes — anything searchable for sector & keyword detection. */
  text: string
}

export type MatchLevel = 'Très cohérent' | 'Cohérent' | 'Moyen' | 'Peu cohérent' | 'Hors cible'

export type MatchConfidence = 'Haute' | 'Moyenne' | 'Faible'

export interface CategoryScores {
  title: number
  contract: number
  location: number
  company: number
  sector: number
  keywords: number
  experience: number
}

export interface MatchResult {
  totalScore: number
  level: MatchLevel
  confidence: MatchConfidence
  categoryScores: CategoryScores
  reasons: string[]
  warnings: string[]
  missingData: string[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/jobMatching.ts
git commit -m "feat: add job matching types"
```

---

### Task 4: `normalizeText` and phrase-matching helpers

**Files:**
- Create: `src/lib/jobMatching.ts`
- Test: `src/lib/jobMatching.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `normalizeText(text: string): string`, and two helpers used internally by every scorer in Task 5: `containsPhrase(haystack: string, phrase: string): boolean` (word-boundary match — required so e.g. `"industrie"` does not falsely match inside `"industriels"`), `eitherContains(a: string, b: string): boolean` (bidirectional substring after normalization — used where phrases are short/specific, like contract types and city names).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jobMatching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeText, containsPhrase, eitherContains } from './jobMatching'

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('Île-de-France')).toBe('ile-de-france')
  })

  it('collapses multiple spaces and trims', () => {
    expect(normalizeText('  Chef   de Projet  ')).toBe('chef de projet')
  })

  it('strips punctuation but keeps hyphens and digits', () => {
    expect(normalizeText('Graduate Program - Exploitation F/H')).toBe('graduate program - exploitation f h')
  })
})

describe('containsPhrase', () => {
  it('matches a whole word', () => {
    expect(containsPhrase('Maintenance préventive et corrective', 'maintenance')).toBe(true)
  })

  it('does not match a substring that is not a whole word', () => {
    expect(containsPhrase('Maintenance préventive et corrective des équipements industriels', 'industrie')).toBe(false)
  })

  it('matches a multi-word phrase with accents in the haystack', () => {
    expect(containsPhrase('Pilotage de projets innovants, coordination, stratégie et gouvernance.', 'stratégie')).toBe(true)
  })

  it('returns false for an empty phrase', () => {
    expect(containsPhrase('anything', '')).toBe(false)
  })
})

describe('eitherContains', () => {
  it('matches when the shorter string is a substring of the longer one', () => {
    expect(eitherContains('CDI', 'CDI-Graduate Program')).toBe(true)
    expect(eitherContains('CDI-Graduate Program', 'CDI')).toBe(true)
  })

  it('matches city aliases regardless of accents/case', () => {
    expect(eitherContains('Courbevoie, France', 'courbevoie')).toBe(true)
  })

  it('returns false when neither contains the other', () => {
    expect(eitherContains('Lyon', 'Paris')).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(eitherContains('', 'Paris')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- jobMatching`
Expected: FAIL — `src/lib/jobMatching.ts` does not exist yet, so the import errors out.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/jobMatching.ts`:

```typescript
// Pure scoring logic for matching a job offer against a user's search
// objective. No React, no Supabase — testable as plain functions.

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary phrase match — avoids "industrie" falsely matching inside "industriels". */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const h = normalizeText(haystack)
  const p = normalizeText(phrase)
  if (!p) return false
  return new RegExp(`\\b${escapeRegExp(p)}\\b`).test(h)
}

/** Bidirectional substring match after normalization — for short/specific tokens (contract types, city names). */
export function eitherContains(a: string, b: string): boolean {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- jobMatching`
Expected: PASS (all `normalizeText`/`containsPhrase`/`eitherContains` tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobMatching.ts src/lib/jobMatching.test.ts
git commit -m "feat: add text normalization and phrase-matching helpers"
```

---

### Task 5: The 7 category scorers + `calculateJobMatch` aggregator

This is the core of the rewrite. All 7 scorers and the aggregator are implemented together because they share helpers and are most meaningfully tested through `calculateJobMatch()` end-to-end — splitting them into 7 separate tasks would mean reviewing untestable fragments.

**Files:**
- Modify: `src/lib/jobMatching.ts` (append to the file from Task 4)
- Modify: `src/lib/jobMatching.test.ts` (append)

**Interfaces:**
- Consumes: `normalizeText`, `containsPhrase`, `eitherContains` (Task 4), `JobMatchInput`, `MatchLevel`, `MatchConfidence`, `CategoryScores`, `MatchResult` (Task 3), `UserGoal` (Task 2).
- Produces: `calculateJobMatch(job: JobMatchInput, objective: UserGoal): MatchResult` — consumed by every UI task from Task 9 onward. Also produces `applicationToJobMatchInput(app: Application): JobMatchInput` for those same tasks.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/jobMatching.test.ts`:

```typescript
import { calculateJobMatch, applicationToJobMatchInput } from './jobMatching'
import type { UserGoal } from '@/lib/types'
import type { Application } from '@/lib/types'

const objective: UserGoal = {
  id: 'g1',
  user_id: 'u1',
  target_title: 'Chef de projet innovation / PMO / Graduate Program',
  target_roles: [
    'chef de projet', 'PMO', 'chargé de projet', 'graduate program',
    'project manager', 'business analyst', 'innovation manager',
  ],
  contract_types: ['CDI', 'Graduate Program', 'VIE', 'Alternance stratégique'],
  locations: ['Paris', 'Île-de-France', 'Courbevoie', 'Puteaux', 'La Défense', 'France'],
  target_companies: ['SNCF', 'Transdev', 'Keolis', 'EssilorLuxottica', 'RATP', 'Alstom'],
  sectors: ['transport', 'mobilité', 'innovation', 'industrie', 'R&D', 'stratégie', 'transformation', 'management de projet'],
  keywords_wanted: [
    'chef de projet', 'gestion de projet', 'PMO', 'innovation', 'coordination',
    'gouvernance', 'stratégie', 'pilotage', 'transformation', 'amélioration continue',
    'management de projet', 'graduate program',
  ],
  keywords_excluded: [
    'logistique pure', 'vente terrain', 'commercial uniquement', 'opérateur',
    'technicien maintenance', 'manutention', 'préparateur de commandes',
  ],
  experience_level: ['junior', 'graduate', 'jeune diplômé', '0-2 ans', 'débutant accepté'],
  scoring_priorities: null,
  target_date: '2027-06-01',
  personal_target: 10,
  created_at: '', updated_at: '',
}

describe('calculateJobMatch — the 4 reference scenarios', () => {
  it('scores a strong match high (Keolis Graduate Program)', () => {
    const result = calculateJobMatch({
      title: 'Graduate Program - Exploitation F/H',
      company: 'Keolis',
      location: 'Courbevoie, France',
      contract: 'CDI',
      text: 'Graduate program dans le secteur du transport avec management opérationnel.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(75)
    expect(result.totalScore).toBeLessThanOrEqual(90)
    expect(result.level).toBe('Très cohérent')
  })

  it('scores a partial match medium (Amazon logistics junior)', () => {
    const result = calculateJobMatch({
      title: "Responsable d'équipe logistique junior",
      company: 'Amazon',
      location: 'Noisy-le-Grand',
      contract: 'CDI',
      text: "Management d'équipe logistique, préparation de commandes, suivi opérationnel.",
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(35)
    expect(result.totalScore).toBeLessThanOrEqual(55)
  })

  it('scores a very strong match high (EssilorLuxottica chef de projet)', () => {
    const result = calculateJobMatch({
      title: 'Chef de projet innovation',
      company: 'EssilorLuxottica',
      location: 'Paris',
      contract: 'CDI',
      text: 'Pilotage de projets innovants, coordination, stratégie et gouvernance.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(85)
    expect(result.level).toBe('Très cohérent')
  })

  it('scores an off-target offer low, never zero (technicien maintenance)', () => {
    const result = calculateJobMatch({
      title: 'Technicien maintenance industrielle',
      company: 'Entreprise inconnue',
      location: 'Lyon',
      contract: 'CDI',
      text: 'Maintenance préventive et corrective des équipements industriels.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(20)
    expect(result.totalScore).toBeLessThanOrEqual(40)
    expect(result.totalScore).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.toLowerCase().includes('technicien maintenance'))).toBe(true)
  })
})

describe('calculateJobMatch — missing data never forces a 0', () => {
  const emptyObjective: UserGoal = {
    ...objective,
    target_roles: [], contract_types: [], locations: [], target_companies: [],
    sectors: [], keywords_wanted: [], keywords_excluded: [], experience_level: [],
    target_title: null,
  }

  it('returns neutral 50s and missingData entries when the objective defines nothing', () => {
    const result = calculateJobMatch({
      title: 'Quelconque', company: 'Quelconque', location: null, contract: null, text: '',
    }, emptyObjective)
    expect(result.categoryScores.title).toBe(50)
    expect(result.categoryScores.contract).toBe(50)
    expect(result.categoryScores.location).toBe(50)
    expect(result.categoryScores.sector).toBe(50)
    expect(result.categoryScores.experience).toBe(50)
    expect(result.missingData.length).toBeGreaterThan(0)
    expect(result.confidence).toBe('Faible')
    expect(result.totalScore).toBeGreaterThan(0)
  })

  it('never scores 0 for a missing location alone, even with a fully-defined objective', () => {
    const result = calculateJobMatch({
      title: 'Chef de projet innovation', company: 'Keolis', location: null, contract: 'CDI',
      text: 'Pilotage de projets, coordination, stratégie.',
    }, objective)
    expect(result.categoryScores.location).toBe(50)
    expect(result.missingData.some((m) => m.toLowerCase().includes('localisation'))).toBe(true)
  })
})

describe('applicationToJobMatchInput', () => {
  it('maps Application fields and folds notes into text', () => {
    const app: Application = {
      id: 'a1', userId: 'u1', company: 'Keolis', position: 'Graduate Program',
      location: 'Courbevoie', jobUrl: null, status: 'APPLIED', contractType: 'CDI',
      notes: 'Secteur transport', appliedAt: null, createdAt: '', updatedAt: '',
    }
    const job = applicationToJobMatchInput(app)
    expect(job.title).toBe('Graduate Program')
    expect(job.company).toBe('Keolis')
    expect(job.location).toBe('Courbevoie')
    expect(job.contract).toBe('CDI')
    expect(job.text).toContain('Graduate Program')
    expect(job.text).toContain('Secteur transport')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- jobMatching`
Expected: FAIL — `calculateJobMatch` and `applicationToJobMatchInput` are not exported yet.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/jobMatching.ts`:

```typescript
import type { UserGoal, Application } from '@/lib/types'
import type { CategoryScores, JobMatchInput, MatchConfidence, MatchLevel, MatchResult } from '@/types/jobMatching'

interface ScoredCategory {
  score: number
  reason?: string
  warning?: string
  missing?: string
}

const STOPWORDS = new Set(['de', 'le', 'la', 'les', 'des', 'du', 'un', 'une', 'et', 'en', 'd', 'l', 'h', 'f'])

function significantWords(s: string): string[] {
  return normalizeText(s).split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

function wordOverlapRatio(needle: string, haystack: string): number {
  const words = significantWords(needle)
  const haystackWords = new Set(significantWords(haystack))
  if (words.length === 0 || haystackWords.size === 0) return 0
  const matched = words.filter((w) => haystackWords.has(w)).length
  return matched / words.length
}

// ─── Title ──────────────────────────────────────────────────────────────────

function scoreTitle(jobTitle: string, objective: UserGoal): ScoredCategory {
  const roles = [objective.target_title, ...objective.target_roles].filter((r): r is string => !!r && r.trim().length > 0)
  if (roles.length === 0) return { score: 50, missing: 'Aucun intitulé ou poste cible défini dans votre objectif' }

  const best = Math.max(...roles.map((role) =>
    eitherContains(role, jobTitle) ? 1 : wordOverlapRatio(role, jobTitle),
  ))

  if (best === 1) return { score: 95, reason: 'Le poste est proche de votre objectif.' }
  if (best >= 0.5) return { score: 75, reason: 'Le poste recoupe partiellement votre objectif.' }
  if (best > 0) return { score: 55, warning: 'Le poste ne recoupe que faiblement votre objectif.' }
  return { score: 35, warning: "Le poste ne correspond pas à l'intitulé ou aux rôles visés." }
}

// ─── Contract ───────────────────────────────────────────────────────────────

function scoreContract(contract: string | null, objective: UserGoal): ScoredCategory {
  if (objective.contract_types.length === 0) return { score: 50, missing: 'Aucun type de contrat défini dans votre objectif' }
  if (!contract || !contract.trim()) return { score: 50, missing: "Type de contrat non renseigné sur l'offre" }

  if (objective.contract_types.some((c) => eitherContains(c, contract))) {
    return { score: 95, reason: 'Le contrat correspond à votre recherche.' }
  }
  if (containsPhrase(contract, 'stage')) {
    return { score: 25, warning: 'Stage — non recherché dans votre objectif.' }
  }
  return { score: 40, warning: 'Le type de contrat ne correspond pas exactement à votre objectif.' }
}

// ─── Location ───────────────────────────────────────────────────────────────

const IDF_ALIASES = ['courbevoie', 'puteaux', 'la defense', 'boulogne-billancourt', 'boulogne billancourt', 'nanterre', 'saint-denis', 'saint denis', 'levallois-perret', 'levallois perret', 'neuilly-sur-seine', 'neuilly sur seine']
const IDF_NAMES = ['paris', 'ile-de-france', 'ile de france', 'idf']
const FOREIGN_HINTS = ['netherlands', 'pays-bas', 'pays bas', 'allemagne', 'germany', 'espagne', 'spain', 'belgique', 'belgium', 'italie', 'italy', 'royaume-uni', 'royaume uni', 'united kingdom', 'etats-unis', 'etats unis', 'usa']

function isIdfReference(s: string): boolean {
  const n = normalizeText(s)
  return IDF_NAMES.some((name) => n.includes(name)) || IDF_ALIASES.some((alias) => n.includes(alias))
}

function scoreLocation(location: string | null, objective: UserGoal): ScoredCategory {
  if (objective.locations.length === 0) return { score: 50, missing: 'Aucune localisation cible définie dans votre objectif' }
  if (!location || !location.trim()) return { score: 50, missing: 'Localisation non renseignée sur l\'offre' }

  if (objective.locations.some((loc) => eitherContains(loc, location))) {
    return { score: 90, reason: 'La localisation est compatible.' }
  }
  if (isIdfReference(location) && objective.locations.some(isIdfReference)) {
    return { score: 85, reason: 'La localisation est dans votre zone Île-de-France.' }
  }
  if (containsPhrase(location, 'france') && objective.locations.some((loc) => !containsPhrase(loc, 'france'))) {
    return { score: 65, reason: 'La localisation est en France, sans correspondre à une zone précise.' }
  }
  if (FOREIGN_HINTS.some((hint) => containsPhrase(location, hint))) {
    return { score: 30, warning: 'La localisation est hors de votre zone géographique cible.' }
  }
  return { score: 40, warning: "La localisation ne correspond à aucune de vos zones cibles." }
}

// ─── Company ────────────────────────────────────────────────────────────────

function scoreCompany(company: string, objective: UserGoal, text: string): ScoredCategory {
  if (!company || !company.trim()) return { score: 50, missing: 'Entreprise non renseignée sur l\'offre' }
  if (objective.target_companies.length === 0) return { score: 50, missing: 'Aucune entreprise cible définie dans votre objectif' }

  if (objective.target_companies.some((c) => eitherContains(c, company))) {
    return { score: 100, reason: "L'entreprise fait partie de vos cibles." }
  }
  if (objective.sectors.some((sector) => containsPhrase(text, sector))) {
    return { score: 65, reason: "L'entreprise est proche de vos secteurs cibles." }
  }
  return { score: 40, warning: "L'entreprise n'a pas de lien évident avec vos cibles." }
}

// ─── Sector ─────────────────────────────────────────────────────────────────

function scoreSector(text: string, objective: UserGoal): ScoredCategory {
  if (objective.sectors.length === 0) return { score: 50, missing: 'Aucun secteur cible défini dans votre objectif' }
  if (!text.trim()) return { score: 50, missing: 'Pas assez de texte sur l\'offre pour évaluer le secteur' }

  if (objective.sectors.some((sector) => containsPhrase(text, sector))) {
    return { score: 85, reason: 'Le secteur est cohérent avec votre objectif.' }
  }
  return { score: 35, warning: 'Le secteur de cette offre semble peu aligné avec votre objectif.' }
}

// ─── Keywords ───────────────────────────────────────────────────────────────

function scoreKeywords(text: string, objective: UserGoal): ScoredCategory {
  const wanted = objective.keywords_wanted
  const excluded = objective.keywords_excluded

  let base: number
  let reason: string | undefined
  let missing: string | undefined
  if (wanted.length === 0) {
    base = 50
    missing = 'Aucun mot-clé positif défini dans votre objectif'
  } else {
    const found = wanted.filter((k) => containsPhrase(text, k))
    const ratio = found.length / wanted.length
    base = Math.round(40 + ratio * 60)
    if (found.length > 0) reason = `Mots-clés cohérents détectés : ${found.join(', ')}`
  }

  const foundExcluded = excluded.filter((k) => containsPhrase(text, k))
  let warning: string | undefined
  if (foundExcluded.length > 0) {
    base = Math.max(0, base - 25 * foundExcluded.length)
    warning = `Mot${foundExcluded.length > 1 ? 's' : ''}-clé${foundExcluded.length > 1 ? 's' : ''} à éviter détecté${foundExcluded.length > 1 ? 's' : ''} : ${foundExcluded.join(', ')}`
  }

  return { score: base, reason, warning, missing }
}

// ─── Experience ─────────────────────────────────────────────────────────────

const SENIOR_HINTS = ['senior', 'confirme', 'expert', '5 ans', '6 ans', '7 ans', '8 ans', '9 ans', '10 ans']
const JUNIOR_HINTS = ['junior', 'graduate', 'jeune diplome', 'debutant', '0-2 ans', '1-2 ans', '1-3 ans', 'stagiaire']

function detectLevel(text: string): 'senior' | 'junior' | 'unknown' {
  if (SENIOR_HINTS.some((h) => containsPhrase(text, h))) return 'senior'
  if (JUNIOR_HINTS.some((h) => containsPhrase(text, h))) return 'junior'
  return 'unknown'
}

function scoreExperience(text: string, objective: UserGoal): ScoredCategory {
  if (objective.experience_level.length === 0) return { score: 50, missing: 'Aucun niveau d\'expérience défini dans votre objectif' }

  const appLevel = detectLevel(text)
  if (appLevel === 'unknown') return { score: 50, missing: "Niveau d'expérience non détecté dans l'offre" }

  const objectiveLevel = objective.experience_level.join(' ')
  const wantsJunior = detectLevel(objectiveLevel) === 'junior' || JUNIOR_HINTS.some((h) => objective.experience_level.some((e) => containsPhrase(e, h)))
  const wantsSenior = detectLevel(objectiveLevel) === 'senior' || SENIOR_HINTS.some((h) => objective.experience_level.some((e) => containsPhrase(e, h)))

  if ((appLevel === 'junior' && wantsJunior) || (appLevel === 'senior' && wantsSenior)) {
    return { score: 90, reason: "Le niveau d'expérience correspond à votre objectif." }
  }
  return { score: 30, warning: "Le niveau d'expérience demandé ne correspond pas à votre objectif." }
}

// ─── Aggregation ────────────────────────────────────────────────────────────

const WEIGHTS: CategoryScores = {
  title: 0.25, contract: 0.15, location: 0.15, company: 0.15, sector: 0.10, keywords: 0.15, experience: 0.05,
}

function levelFor(score: number): MatchLevel {
  if (score >= 75) return 'Très cohérent'
  if (score >= 60) return 'Cohérent'
  if (score >= 45) return 'Moyen'
  if (score >= 30) return 'Peu cohérent'
  return 'Hors cible'
}

function confidenceFor(missingCount: number): MatchConfidence {
  if (missingCount === 0) return 'Haute'
  if (missingCount <= 2) return 'Moyenne'
  return 'Faible'
}

export function calculateJobMatch(job: JobMatchInput, objective: UserGoal): MatchResult {
  const text = `${job.title} ${job.company} ${job.text}`.trim()

  const title = scoreTitle(job.title, objective)
  const contract = scoreContract(job.contract, objective)
  const location = scoreLocation(job.location, objective)
  const company = scoreCompany(job.company, objective, text)
  const sector = scoreSector(text, objective)
  const keywords = scoreKeywords(text, objective)
  const experience = scoreExperience(text, objective)

  const categories = { title, contract, location, company, sector, keywords, experience }
  const categoryScores: CategoryScores = {
    title: title.score, contract: contract.score, location: location.score,
    company: company.score, sector: sector.score, keywords: keywords.score, experience: experience.score,
  }

  const weightedSum = (Object.keys(WEIGHTS) as (keyof CategoryScores)[])
    .reduce((sum, key) => sum + categoryScores[key] * WEIGHTS[key], 0)

  const excludedHits = objective.keywords_excluded.filter((k) => containsPhrase(text, k)).length
  const globalPenalty = Math.min(15, excludedHits * 5)
  const totalScore = Math.max(5, Math.min(100, Math.round(weightedSum) - globalPenalty))

  const reasons = Object.values(categories).map((c) => c.reason).filter((r): r is string => !!r)
  const warnings = Object.values(categories).map((c) => c.warning).filter((w): w is string => !!w)
  const missingData = Object.values(categories).map((c) => c.missing).filter((m): m is string => !!m)

  return {
    totalScore,
    level: levelFor(totalScore),
    confidence: confidenceFor(missingData.length),
    categoryScores,
    reasons,
    warnings,
    missingData,
  }
}

export function applicationToJobMatchInput(app: Application): JobMatchInput {
  return {
    title: app.position,
    company: app.company,
    location: app.location,
    contract: app.contractType,
    text: [app.position, app.notes].filter(Boolean).join('. '),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- jobMatching`
Expected: PASS — all scenario tests, missing-data tests, and the adapter test green. If any of the 4 reference-scenario score ranges fail, adjust the relevant `scoreX` thresholds (not the test ranges, which come directly from the user's spec) until they pass — the weighted-sum walkthrough in the design spec shows expected per-category scores of roughly: scenario 1 (Keolis) ≈86%, scenario 2 (Amazon) ≈49%, scenario 3 (EssilorLuxottica) ≈88%, scenario 4 (technicien maintenance) ≈38%.

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobMatching.ts src/lib/jobMatching.test.ts
git commit -m "feat: implement calculateJobMatch with 7 weighted scoring categories"
```

---

### Task 6: Replace `scoreTierColor` with `matchLevelColor`

**Files:**
- Modify: `src/utils/statusLabels.ts:25-35`

**Interfaces:**
- Consumes: `MatchLevel` (Task 3).
- Produces: `matchLevelColor(level: MatchLevel): { fg: string; bg: string }` — consumed by Task 7 (`MatchScoreBadge`) and Task 8 (`MatchDetailsModal`).

- [ ] **Step 1: Replace the old tier-color function**

In `src/utils/statusLabels.ts`, replace lines 25-35 (the `ScoreTierColor` interface and `scoreTierColor` function):

```typescript
import type { MatchLevel } from '@/types/jobMatching'

export interface MatchLevelColor {
  fg: string
  bg: string
}

// Single source for the 5-tier match-level color ramp, used by MatchScoreBadge and MatchDetailsModal.
export function matchLevelColor(level: MatchLevel): MatchLevelColor {
  switch (level) {
    case 'Très cohérent':  return { fg: '#059669', bg: '#d1fae5' }
    case 'Cohérent':       return { fg: '#0284c7', bg: '#e0f2fe' }
    case 'Moyen':          return { fg: '#d97706', bg: '#fef3c7' }
    case 'Peu cohérent':   return { fg: '#ea580c', bg: '#ffedd5' }
    case 'Hors cible':     return { fg: '#dc2626', bg: '#fee2e2' }
  }
}
```

- [ ] **Step 2: Confirm no other file still imports the removed symbols**

Run: `grep -rn "scoreTierColor\|ScoreTierColor" src/`
Expected: no matches outside this file at this point would mean nothing else needs updating for this symbol — but `GoalBadge.tsx` and `ApplicationDetail.tsx` currently still import `scoreTierColor` (Tasks 7 and 10 replace those usages). If this grep shows hits in those two files, that is expected and resolved later in the plan, not a blocker for this task.

- [ ] **Step 3: Commit**

```bash
git add src/utils/statusLabels.ts
git commit -m "refactor: replace scoreTierColor with 5-tier matchLevelColor"
```

---

### Task 7: `MatchScoreBadge` component (replaces `GoalBadge`)

**Files:**
- Create: `src/components/applications/MatchScoreBadge.tsx`
- Delete: `src/components/applications/GoalBadge.tsx`

**Interfaces:**
- Consumes: `MatchResult` (Task 3), `matchLevelColor` (Task 6).
- Produces: `<MatchScoreBadge result={matchResult} onClick={() => void} />` — consumed by Tasks 9, 10, 11.

- [ ] **Step 1: Create the new badge**

Create `src/components/applications/MatchScoreBadge.tsx`:

```typescript
import { Target } from 'lucide-react'
import type { MatchResult } from '@/types/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'

interface MatchScoreBadgeProps {
  result: MatchResult
  onClick?: () => void
}

export function MatchScoreBadge({ result, onClick }: MatchScoreBadgeProps) {
  const { fg: color, bg } = matchLevelColor(result.level)

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
      style={{ color, background: bg }}
      title={`${result.totalScore}% — ${result.level}`}
    >
      <Target size={8} />
      {result.totalScore}% {result.level}
    </button>
  )
}
```

- [ ] **Step 2: Delete the old badge**

Run: `git rm src/components/applications/GoalBadge.tsx`
Expected: file removed. (Its consumers are not yet updated — that happens in Tasks 9-11, which is why this is the same task as creating the replacement: a partial deletion would leave a dangling import with no fix path inside this task's boundary.)

- [ ] **Step 3: Commit**

```bash
git add src/components/applications/MatchScoreBadge.tsx
git commit -m "feat: add MatchScoreBadge, remove old GoalBadge"
```

---

### Task 8: `MatchDetailsModal` component

**Files:**
- Create: `src/components/applications/MatchDetailsModal.tsx`

**Interfaces:**
- Consumes: `MatchResult` (Task 3), `matchLevelColor` (Task 6).
- Produces: `<MatchDetailsModal result={matchResult} onClose={() => void} />` — consumed by Tasks 9, 10, 11.

- [ ] **Step 1: Create the modal**

Create `src/components/applications/MatchDetailsModal.tsx`:

```typescript
import { X } from 'lucide-react'
import type { CategoryScores, MatchResult } from '@/types/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'

interface MatchDetailsModalProps {
  result: MatchResult
  onClose: () => void
}

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  title: 'Poste',
  contract: 'Contrat',
  location: 'Localisation',
  company: 'Entreprise',
  sector: 'Secteur',
  keywords: 'Mots-clés',
  experience: 'Expérience',
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'var(--color-accent)' }} />
      </div>
    </div>
  )
}

export function MatchDetailsModal({ result, onClose }: MatchDetailsModalProps) {
  const { fg: color, bg } = matchLevelColor(result.level)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Score global</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{result.totalScore}%</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
              {result.level}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <X size={15} style={{ color: 'var(--color-muted)' }} />
            </button>
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Confiance : {result.confidence}</p>

        <div className="flex flex-col gap-3">
          {(Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).map((key) => (
            <CategoryBar key={key} label={CATEGORY_LABELS[key]} value={result.categoryScores[key]} />
          ))}
        </div>

        {result.reasons.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Pourquoi cette note ?</h4>
            <ul className="flex flex-col gap-1">
              {result.reasons.map((r) => (
                <li key={r} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-success)' }}>•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Points d'attention</h4>
            <ul className="flex flex-col gap-1">
              {result.warnings.map((w) => (
                <li key={w} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-warning)' }}>•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.missingData.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Données manquantes</h4>
            <ul className="flex flex-col gap-1">
              {result.missingData.map((m) => (
                <li key={m} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span>•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/applications/MatchDetailsModal.tsx
git commit -m "feat: add MatchDetailsModal"
```

---

### Task 9: Wire `CandidateTable` and `ApplicationCard` to the new system

**Files:**
- Modify: `src/components/applications/CandidateTable.tsx`
- Modify: `src/components/applications/ApplicationCard.tsx`

**Interfaces:**
- Consumes: `calculateJobMatch`, `applicationToJobMatchInput` (Task 5), `MatchScoreBadge` (Task 7), `MatchDetailsModal` (Task 8).

- [ ] **Step 1: Update `CandidateTable.tsx`**

Replace lines 1-7 of `src/components/applications/CandidateTable.tsx`:

```typescript
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { MatchScoreBadge } from './MatchScoreBadge'
import { MatchDetailsModal } from './MatchDetailsModal'
import { CompanyLogo } from './CompanyLogo'
import { formatDate } from '@/lib/utils'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import type { Application, UserGoal } from '@/lib/types'
```

Then replace the score computation and badge cell (originally lines 45-47 and 69):

```typescript
        <tbody>
          {applications.map((app) => {
            const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
            return (
```

and:

```typescript
                <td className="px-3 py-3.5">
                  {match ? <MatchScoreBadge result={match} onClick={() => setDetailsFor(match)} /> : <span className="text-[12px]" style={{ color: 'var(--color-subtle)' }}>—</span>}
                </td>
```

Add local state for the open modal right after the `CandidateTable` function signature line, and render the modal once at the end of the component (just before the closing `</div>` that wraps the `<table>`):

```typescript
export function CandidateTable({ applications, goal, onOpenDetail, onEdit, onDelete, resolveLogo }: CandidateTableProps) {
  const [detailsFor, setDetailsFor] = useState<ReturnType<typeof calculateJobMatch> | null>(null)

  return (
    <div className="card overflow-hidden">
```

```typescript
      </table>
      {detailsFor && <MatchDetailsModal result={detailsFor} onClose={() => setDetailsFor(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Update `ApplicationCard.tsx`**

Replace the full content of `src/components/applications/ApplicationCard.tsx`:

```typescript
import { useState } from 'react'
import { MapPin, FileText } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { CompanyLogo } from './CompanyLogo'
import { MatchScoreBadge } from './MatchScoreBadge'
import { MatchDetailsModal } from './MatchDetailsModal'
import { formatDate } from '@/lib/utils'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import type { Application, UserGoal } from '@/lib/types'

interface ApplicationCardProps {
  application: Application
  goal?: UserGoal | null
  onClick: () => void
  logoUrl?: string
}

export function ApplicationCard({ application, goal, onClick, logoUrl }: ApplicationCardProps) {
  const { company, position, location, contractType, status, createdAt } = application
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(application), goal) : null
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className="card px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:-translate-y-px"
      style={{ borderColor: 'var(--color-border)' }}
      onClick={onClick}
    >
      <CompanyLogo company={company} logoUrl={logoUrl} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{position}</div>
        <div className="text-[var(--color-muted)] text-xs">{company}</div>
        {(location || contractType) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-muted)]">
            {location && <span className="flex items-center gap-1"><MapPin size={11} />{location}</span>}
            {contractType && <span className="flex items-center gap-1"><FileText size={11} />{contractType}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <StatusBadge status={status} />
        <div className="flex items-center gap-1.5">
          {match && <MatchScoreBadge result={match} onClick={() => setShowDetails(true)} />}
          <span className="text-xs text-[var(--color-muted)]">{formatDate(createdAt)}</span>
        </div>
      </div>

      {showDetails && match && <MatchDetailsModal result={match} onClose={() => setShowDetails(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/applications/CandidateTable.tsx src/components/applications/ApplicationCard.tsx
git commit -m "refactor: wire CandidateTable and ApplicationCard to calculateJobMatch"
```

---

### Task 10: Wire `ApplicationDetail` to the new system

**Files:**
- Modify: `src/components/applications/ApplicationDetail.tsx`

**Interfaces:**
- Consumes: `calculateJobMatch`, `applicationToJobMatchInput` (Task 5), `MatchScoreBadge` (Task 7), `MatchDetailsModal` (Task 8).

- [ ] **Step 1: Update imports and score computation**

In `src/components/applications/ApplicationDetail.tsx`, replace line 10:

```typescript
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
```

Replace line 12 (`import { scoreTierColor } from '@/utils/statusLabels'`) — delete it; it's no longer used once the inline breakdown block below is replaced.

Add `MatchScoreBadge`/`MatchDetailsModal` imports next to the other component imports near the top (after the `CoverLetterGenerator` import):

```typescript
import { MatchScoreBadge } from './MatchScoreBadge'
import { MatchDetailsModal } from './MatchDetailsModal'
```

Replace line 61-62:

```typescript
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(application), goal) : null
  const [showMatchDetails, setShowMatchDetails] = useState(false)
```

(`useState` is already imported at the top of this file from `react`.)

- [ ] **Step 2: Replace the inline score breakdown block**

Replace lines 313-336 (the `{score !== null && (...)}` block with the criteria `<ul>`):

```typescript
          {match && (
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Target size={13} />
                Correspondance avec votre objectif
              </h4>
              <MatchScoreBadge result={match} onClick={() => setShowMatchDetails(true)} />
            </div>
          )}
```

- [ ] **Step 3: Render the modal**

Just before the closing `</div>` that wraps the whole component (right before the `{coverLetterOpen && (...)}` block near the end of the file), add:

```typescript
      {showMatchDetails && match && (
        <MatchDetailsModal result={match} onClose={() => setShowMatchDetails(false)} />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/applications/ApplicationDetail.tsx
git commit -m "refactor: wire ApplicationDetail to calculateJobMatch"
```

---

### Task 11: Wire `KanbanPage` and `ApplicationsPage` to the new system

**Files:**
- Modify: `src/pages/KanbanPage.tsx`
- Modify: `src/pages/ApplicationsPage.tsx`

**Interfaces:**
- Consumes: `calculateJobMatch`, `applicationToJobMatchInput` (Task 5), `MatchScoreBadge` (Task 7), `MatchDetailsModal` (Task 8).

- [ ] **Step 1: Update `KanbanPage.tsx` imports**

Replace lines 13-14:

```typescript
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import { MatchScoreBadge } from '@/components/applications/MatchScoreBadge'
import { MatchDetailsModal } from '@/components/applications/MatchDetailsModal'
```

- [ ] **Step 2: Update `SortableCard` (lines 46-89)**

Replace the function body:

```typescript
function SortableCard({ app, goal, onOpen, logoUrl }: { app: Application; goal?: UserGoal | null; onOpen: () => void; logoUrl?: string }) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
  const [showDetails, setShowDetails] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: '#ffffff',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        boxShadow: 'var(--shadow-soft)',
      }}
      {...attributes}
      {...listeners}
      className="rounded-[var(--radius-lg)] px-3.5 py-3.5 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-[var(--shadow-md)]"
      onClick={onOpen}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo company={app.company} logoUrl={logoUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug text-[var(--color-text)] break-words" title={app.position}>{app.position}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1 truncate" title={app.company}>{app.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-[var(--color-muted)]">
        <span className="truncate">{app.location ?? '—'}</span>
        {app.appliedAt && (
          <>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0 whitespace-nowrap">{formatDate(app.appliedAt)}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {match ? <MatchScoreBadge result={match} onClick={() => setShowDetails(true)} /> : <span />}
        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-accent)' }}>Voir →</span>
      </div>
      {showDetails && match && <MatchDetailsModal result={match} onClose={() => setShowDetails(false)} />}
    </div>
  )
}
```

Note `useState` must be added to the existing `import { useMemo, useState } from 'react'` on line 10 of this file — it's already imported there, so no change needed.

- [ ] **Step 3: Run a build check on `KanbanPage.tsx` in isolation**

Run: `grep -n "GoalBadge\|computeAppScore" src/pages/KanbanPage.tsx`
Expected: no matches.

- [ ] **Step 4: Update `ApplicationsPage.tsx` imports**

Replace lines 5 and 10:

```typescript
import { MatchScoreBadge } from '@/components/applications/MatchScoreBadge'
```

```typescript
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
```

- [ ] **Step 5: Update `AppThumbnail` (lines 45-87)**

Replace lines 45-47 and 81:

```typescript
function AppThumbnail({ app, goal, onClick, logoUrl }: { app: Application; goal?: UserGoal | null; onClick: () => void; logoUrl?: string }) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
  const STATUS_DOT: Partial<Record<ApplicationStatus, string>> = {
```

```typescript
          {match && <MatchScoreBadge result={match} onClick={onClick} />}
```

(`AppThumbnail` has no per-card modal state — clicking the badge here opens the same detail view as clicking the card, via `onClick`, since the grid view already opens `ApplicationDetail` on click and that now renders the full `MatchDetailsModal` trigger itself via Task 10.)

- [ ] **Step 6: Update the sort comparator (lines 157-172)**

Replace the `match_desc` case at line 165-166:

```typescript
        case 'match_desc': {
          const scoreOf = (app: Application) => goal ? calculateJobMatch(applicationToJobMatchInput(app), goal).totalScore : -1
          return scoreOf(b) - scoreOf(a)
        }
```

- [ ] **Step 7: Confirm no stale imports remain**

Run: `grep -n "GoalBadge\|computeAppScore\|computeAppScoreBreakdown" src/pages/ApplicationsPage.tsx src/pages/KanbanPage.tsx`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add src/pages/KanbanPage.tsx src/pages/ApplicationsPage.tsx
git commit -m "refactor: wire KanbanPage and ApplicationsPage to calculateJobMatch"
```

---

### Task 12: Rewrite `GoalsPage.tsx` — 5 cards + extended `EditGoalModal`

**Files:**
- Modify: `src/pages/GoalsPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useGoals`, `GoalUpdate` (Task 2), `calculateJobMatch`, `applicationToJobMatchInput` (Task 5), `MatchLevel` (Task 3), `matchLevelColor` (Task 6).
- Produces: `<GoalsPage userId={string} applications={Application[]} />` — same external props as before, so `App.tsx`'s `<Route path="goals" .../>` needs no change.

- [ ] **Step 1: Replace the full content of `src/pages/GoalsPage.tsx`**

```typescript
import { useMemo, useRef, useState } from 'react'
import {
  Target, MapPin, Briefcase, Clock, Building2, Pencil, X, Plus,
  CheckCircle2, AlertCircle, Lightbulb, Layers, ThumbsUp, ThumbsDown, GraduationCap,
} from 'lucide-react'
import { useGoals, type GoalUpdate } from '@/hooks/useGoals'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'
import type { Application, UserGoal } from '@/lib/types'
import type { MatchLevel, MatchResult } from '@/types/jobMatching'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']

const TIMELINE_OPTIONS = [
  { value: '1m',  label: 'Urgent',       sub: '< 1 mois' },
  { value: '3m',  label: 'Court terme',  sub: '1–3 mois' },
  { value: '6m',  label: 'Moyen terme',  sub: '3–6 mois' },
  { value: '12m', label: 'Long terme',   sub: '> 6 mois' },
]

const LEVELS: MatchLevel[] = ['Très cohérent', 'Cohérent', 'Moyen', 'Peu cohérent', 'Hors cible']

// ─── Utilities ────────────────────────────────────────────────────────────────

function targetDateFromOption(opt: string): string {
  const now = new Date()
  const months = ({ '1m': 1, '3m': 3, '6m': 6, '12m': 12 } as Record<string, number>)[opt] ?? 3
  now.setMonth(now.getMonth() + months)
  return now.toISOString().slice(0, 10)
}

function optionFromTargetDate(date: string | null): string {
  if (!date) return ''
  const diff = Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (diff <= 1) return '1m'
  if (diff <= 3) return '3m'
  if (diff <= 6) return '6m'
  return '12m'
}

function formatDateShort(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

const ACTIVE_STATUSES = new Set(['WISHLIST', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'])

function computeMatches(goal: UserGoal | null, applications: Application[]): MatchResult[] {
  if (!goal) return []
  return applications
    .filter((a) => ACTIVE_STATUSES.has(a.status))
    .map((a) => calculateJobMatch(applicationToJobMatchInput(a), goal))
}

function buildRecommendations(goal: UserGoal | null, matches: MatchResult[]): string[] {
  const recs: string[] = []
  if (!goal) return ['Définissez votre objectif pour recevoir des recommandations personnalisées.']

  const roleCount = goal.target_roles.length + (goal.target_title ? 1 : 0)
  if (roleCount <= 1) {
    recs.push('Votre objectif est trop large : ajoutez davantage de postes ou intitulés ciblés pour affiner le matching.')
  }

  if (matches.length > 0) {
    const lowLocation = matches.filter((m) => m.categoryScores.location < 45).length
    if (lowLocation / matches.length > 0.4) {
      recs.push(`${lowLocation} candidature${lowLocation > 1 ? 's' : ''} sur ${matches.length} sont hors de votre zone géographique cible.`)
    }

    const goodSector = matches.filter((m) => m.categoryScores.sector >= 75).length
    if (goodSector / matches.length >= 0.5) {
      const pct = Math.round((goodSector / matches.length) * 100)
      recs.push(`${pct}% de vos candidatures sont dans vos secteurs cibles, ce qui est cohérent avec votre objectif.`)
    }

    const avgMissing = matches.reduce((sum, m) => sum + m.missingData.length, 0) / matches.length
    if (avgMissing >= 2) {
      recs.push('Certaines offres n\'ont pas assez d\'informations (notes, contrat, localisation) pour être correctement évaluées.')
    }
  }

  if (recs.length === 0) {
    recs.push('Votre objectif est bien défini et vos candidatures sont globalement alignées. Continuez ainsi !')
  }

  return recs.slice(0, 4)
}

// ─── Primitive sub-components ────────────────────────────────────────────────

function CardShell({ icon: Icon, iconColor, iconBg, title, children }: {
  icon: React.ElementType; iconColor: string; iconBg: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyChip() {
  return <span className="text-xs italic" style={{ color: 'var(--color-muted)' }}>Non défini</span>
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  )
}

function ChipList({ items, color, bg }: { items: string[]; color: string; bg: string }) {
  if (items.length === 0) return <EmptyChip />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => <Chip key={i} label={i} color={color} bg={bg} />)}
    </div>
  )
}

function TagInput({ tags, placeholder, onChange }: { tags: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function add() {
    const v = draft.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setDraft('')
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border cursor-text min-h-[40px] transition-colors focus-within:border-sky-400"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
          {t}
          <button type="button" className="opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)) }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        className="flex-1 min-w-[80px] border-0 bg-transparent text-xs outline-none"
        style={{ color: 'var(--color-ink)' }}
        placeholder={tags.length === 0 ? placeholder : 'Ajouter…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !draft) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
      />
    </div>
  )
}

// ─── Card 1: Objectif principal ──────────────────────────────────────────────

function MainObjectiveCard({ goal, onEdit }: { goal: UserGoal | null; onEdit: () => void }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start justify-between gap-4"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        boxShadow: '0 8px 32px rgba(0, 59, 92, 0.25)',
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/70 mb-1 uppercase tracking-wide">Objectif principal</p>
          {!goal?.target_title ? (
            <p className="text-white/60 text-sm italic">Aucun intitulé cible défini — cliquez sur Modifier pour commencer.</p>
          ) : (
            <p className="text-white font-semibold text-base leading-snug mb-2">🎯 {goal.target_title}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Briefcase size={12} />{goal?.contract_types.length ? goal.contract_types.join(' / ') : 'Contrat non défini'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <MapPin size={12} />{goal?.locations.length ? goal.locations.slice(0, 3).join(' / ') : 'Localisation non définie'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Clock size={12} />{goal?.target_date ? `avant ${formatDateShort(goal.target_date)}` : 'Pas d\'échéance'}
            </span>
          </div>
          {goal?.scoring_priorities && (
            <p className="text-xs text-white/70 mt-2 italic">« {goal.scoring_priorities} »</p>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition-colors flex-shrink-0"
      >
        <Pencil size={12} />
        Modifier
      </button>
    </div>
  )
}

// ─── Card 2: Critères de recherche ───────────────────────────────────────────

function SearchCriteriaCard({ goal }: { goal: UserGoal | null }) {
  return (
    <CardShell icon={Layers} iconColor="var(--color-accent)" iconBg="var(--color-status-applied-bg)" title="Critères de recherche">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Postes ciblés</p>
          <ChipList items={goal?.target_roles ?? []} color="var(--color-accent)" bg="var(--color-status-applied-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Secteurs</p>
          <ChipList items={goal?.sectors ?? []} color="var(--color-info)" bg="var(--color-info-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Entreprises cibles</p>
          <ChipList items={goal?.target_companies ?? []} color="var(--color-amber)" bg="var(--color-status-interview-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <ThumbsUp size={11} />Mots-clés positifs
          </p>
          <ChipList items={goal?.keywords_wanted ?? []} color="var(--color-success)" bg="var(--color-status-offer-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <ThumbsDown size={11} />Mots-clés à éviter
          </p>
          <ChipList items={goal?.keywords_excluded ?? []} color="var(--color-danger)" bg="var(--color-status-rejected-bg)" />
        </div>
      </div>
    </CardShell>
  )
}

// ─── Card 3: Score global de cohérence ───────────────────────────────────────

function GlobalCoherenceCard({ matches }: { matches: MatchResult[] }) {
  const avg = matches.length === 0 ? null : Math.round(matches.reduce((s, m) => s + m.totalScore, 0) / matches.length)

  return (
    <CardShell icon={Building2} iconColor="var(--color-amber)" iconBg="var(--color-status-interview-bg)" title="Score global de cohérence">
      {avg === null ? (
        <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>
          Aucune candidature active pour le moment — le score apparaîtra dès votre première candidature.
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <p className="text-3xl font-bold" style={{ color: matchLevelColor(matches[0] ? (avg >= 75 ? 'Très cohérent' : avg >= 60 ? 'Cohérent' : avg >= 45 ? 'Moyen' : avg >= 30 ? 'Peu cohérent' : 'Hors cible') : 'Moyen').fg }}>
            {avg}%
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Moyenne sur {matches.length} candidature{matches.length > 1 ? 's' : ''} active{matches.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </CardShell>
  )
}

// ─── Card 4: Répartition des candidatures ────────────────────────────────────

function DistributionCard({ matches }: { matches: MatchResult[] }) {
  const counts = LEVELS.map((level) => ({ level, count: matches.filter((m) => m.level === level).length }))
  const max = Math.max(1, ...counts.map((c) => c.count))

  return (
    <CardShell icon={Target} iconColor="var(--color-info)" iconBg="var(--color-info-bg)" title="Répartition des candidatures">
      {matches.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>Aucune candidature active à répartir.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {counts.map(({ level, count }) => {
            const { fg } = matchLevelColor(level)
            return (
              <div key={level} className="flex items-center gap-2.5">
                <span className="text-xs font-medium w-28 flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{level}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: fg }} />
                </div>
                <span className="text-xs font-bold w-6 text-right" style={{ color: 'var(--color-ink)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </CardShell>
  )
}

// ─── Card 5: Recommandations ──────────────────────────────────────────────────

function RecommendationsCard({ goal, matches }: { goal: UserGoal | null; matches: MatchResult[] }) {
  const recs = useMemo(() => buildRecommendations(goal, matches), [goal, matches])

  return (
    <CardShell icon={Lightbulb} iconColor="var(--color-amber)" iconBg="var(--color-status-interview-bg)" title="Recommandations">
      <div className="flex flex-col gap-2.5">
        {recs.map((r) => (
          <div key={r} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>{r}</p>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditGoalModalProps {
  goal: UserGoal | null
  saving: boolean
  onSave: (u: GoalUpdate) => void
  onClose: () => void
}

function EditGoalModal({ goal, saving, onSave, onClose }: EditGoalModalProps) {
  const [targetTitle, setTargetTitle] = useState(goal?.target_title ?? '')
  const [roles, setRoles] = useState<string[]>(goal?.target_roles ?? [])
  const [contracts, setContracts] = useState<string[]>(goal?.contract_types ?? [])
  const [locations, setLocations] = useState<string[]>(goal?.locations ?? [])
  const [companies, setCompanies] = useState<string[]>(goal?.target_companies ?? [])
  const [sectors, setSectors] = useState<string[]>(goal?.sectors ?? [])
  const [keywordsWanted, setKeywordsWanted] = useState<string[]>(goal?.keywords_wanted ?? [])
  const [keywordsExcluded, setKeywordsExcluded] = useState<string[]>(goal?.keywords_excluded ?? [])
  const [experienceLevel, setExperienceLevel] = useState<string[]>(goal?.experience_level ?? [])
  const [priorities, setPriorities] = useState(goal?.scoring_priorities ?? '')
  const [timeline, setTimeline] = useState(optionFromTargetDate(goal?.target_date ?? null))
  const [target, setTarget] = useState(goal?.personal_target ?? 10)

  function handleSave() {
    onSave({
      target_title: targetTitle.trim() || null,
      target_roles: roles,
      contract_types: contracts,
      locations,
      target_companies: companies,
      sectors,
      keywords_wanted: keywordsWanted,
      keywords_excluded: keywordsExcluded,
      experience_level: experienceLevel,
      scoring_priorities: priorities.trim() || null,
      target_date: timeline ? targetDateFromOption(timeline) : null,
      personal_target: target,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-status-applied-bg)' }}>
              <Target size={14} style={{ color: 'var(--color-accent)' }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>Modifier mon objectif</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={15} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Intitulé cible</label>
            <input
              className="input w-full text-sm"
              placeholder="Chef de projet innovation / PMO / Graduate Program"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Postes recherchés</label>
            <TagInput tags={roles} placeholder="Chef de projet, PMO… (Entrée)" onChange={setRoles} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Délai de recherche</label>
            <div className="grid grid-cols-4 gap-2">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeline(opt.value)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all',
                    timeline === opt.value ? 'border-sky-600 bg-sky-50' : 'border-[var(--color-border)] hover:border-sky-400',
                  )}
                >
                  <span className="text-xs font-semibold" style={{ color: timeline === opt.value ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Types de contrat acceptés</label>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_OPTIONS.map((c) => {
                const active = contracts.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContracts(active ? contracts.filter((x) => x !== c) : [...contracts, c])}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-[var(--color-border)] hover:border-sky-400',
                    )}
                    style={active ? {} : { color: 'var(--color-muted)' }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Localisations acceptées</label>
            <TagInput tags={locations} placeholder="Paris, Île-de-France… (Entrée)" onChange={setLocations} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Entreprises cibles</label>
            <TagInput tags={companies} placeholder="Keolis, SNCF… (Entrée)" onChange={setCompanies} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Secteurs recherchés</label>
            <TagInput tags={sectors} placeholder="Transport, innovation… (Entrée)" onChange={setSectors} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <ThumbsUp size={12} />Mots-clés positifs
            </label>
            <TagInput tags={keywordsWanted} placeholder="Pilotage, coordination… (Entrée)" onChange={setKeywordsWanted} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <ThumbsDown size={12} />Mots-clés à éviter
            </label>
            <TagInput tags={keywordsExcluded} placeholder="Manutention, opérateur… (Entrée)" onChange={setKeywordsExcluded} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <GraduationCap size={12} />Niveau d'expérience recherché
            </label>
            <TagInput tags={experienceLevel} placeholder="Junior, graduate, 0-2 ans… (Entrée)" onChange={setExperienceLevel} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Priorités de scoring (informatif)</label>
            <textarea
              className="input w-full text-sm resize-y"
              rows={2}
              placeholder="Ex : je privilégie le secteur transport et le PMO avant tout."
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>
              Ce champ est informatif uniquement — il n'affecte pas le calcul du score.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Objectif mensuel de candidatures</label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={200}
                className="input w-24 py-1.5 px-3 text-sm"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>candidatures / mois</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="btn btn-secondary text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--color-status-applied-bg)' }}>
        <Target size={36} style={{ color: 'var(--color-accent)' }} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>Définissez votre objectif de recherche</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-muted)' }}>
          Précisez vos critères pour obtenir un score de cohérence fiable sur chacune de vos candidatures.
        </p>
      </div>
      <button onClick={onEdit} className="btn btn-primary flex items-center gap-2">
        <Plus size={15} />
        Créer votre objectif
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface GoalsPageProps {
  userId: string
  applications: Application[]
}

export function GoalsPage({ userId, applications }: GoalsPageProps) {
  const { goal, loading, saving, saveGoal } = useGoals(userId)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const matches = useMemo(() => computeMatches(goal, applications), [goal, applications])
  const hasGoal = !!(goal?.target_title || goal?.target_roles.length || goal?.contract_types.length || goal?.locations.length)

  async function handleSave(updates: GoalUpdate) {
    setError(null)
    const err = await saveGoal(updates)
    if (err) { setError(err); return }
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Objectifs</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Définissez votre stratégie et suivez la cohérence de vos candidatures</p>
      </div>

      {(saved || error) && (
        <div className="flex items-center gap-3 mb-4">
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 size={15} />
              Enregistré
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {!hasGoal && !editing ? (
        <EmptyState onEdit={() => setEditing(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="lg:col-span-2">
            <MainObjectiveCard goal={goal} onEdit={() => setEditing(true)} />
          </div>
          <SearchCriteriaCard goal={goal} />
          <div className="flex flex-col gap-5">
            <GlobalCoherenceCard matches={matches} />
            <DistributionCard matches={matches} />
          </div>
          <div className="lg:col-span-2">
            <RecommendationsCard goal={goal} matches={matches} />
          </div>
        </div>
      )}

      {editing && (
        <EditGoalModal goal={goal} saving={saving} onSave={handleSave} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Confirm no stale references remain anywhere in the app**

Run: `grep -rn "computeAppScore\|computeAppScoreBreakdown\|computeAlignment\|GoalAlignment\|ScoreCriterion\|GoalBadge\|scoreTierColor\|target_positions\|\.zones\b" src/`
Expected: no matches. (`goal.zones`/`goal.target_positions` would only appear as stale references at this point — everything should now read `target_roles`/`locations`.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/GoalsPage.tsx
git commit -m "feat: rebuild GoalsPage with 5 cards driven by calculateJobMatch"
```

---

### Task 13: Final verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Confirm `App.tsx` and `DashboardPage.tsx` still compile against the new `useGoals` signature**

Run: `grep -n "useGoals(" src/App.tsx src/pages/DashboardPage.tsx`
Expected:
```
src/App.tsx:27:  const { goal } = useGoals(user?.id ?? null)
src/pages/DashboardPage.tsx:180:  const { goal } = useGoals(userId)
```
Both already call `useGoals` with a single argument, so they need no code change for the new signature from Task 2. If either still passes a second `applications` argument, remove it now.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all `jobMatching.test.ts` suites pass (PASS), 0 failures.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: 0 errors, 0 warnings. Fix any unused-import or type errors surfaced by the rewrite (most likely candidates: leftover `GoalAlignment`/`ScoreCriterion` type imports, unused `useState` imports in files that no longer need them).

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: `tsc` reports 0 errors and `vite build` completes. If `tsc` reports errors, they will point at exact file:line — fix each one (most likely leftover references to old `UserGoal` field names `zones`/`target_positions`/`type`, or old `useGoals` exports) and re-run until clean.

- [ ] **Step 5: Manual smoke test**

Run the dev server (`npm run dev`), log in, and check:
- Objectifs page: create/edit a goal with all new fields (intitulé cible, postes, contrat, localisations, entreprises, secteurs, mots-clés +/-, niveau d'expérience, priorités, délai, objectif mensuel) and confirm it saves and reloads correctly.
- Candidatures page (list, grid, kanban views): each application shows a `MatchScoreBadge`, and clicking it opens `MatchDetailsModal` with the 7 category bars, reasons, warnings, and missing data.
- Application detail drawer: same badge/modal behavior.
- Objectifs page reflects the candidatures: "Score global de cohérence" and "Répartition des candidatures" update based on real data.

- [ ] **Step 6: Final commit (only if Steps 3-4 required fixes)**

```bash
git add -A
git commit -m "fix: resolve lint/build issues from job-matching rewrite"
```

---

## Self-Review Notes

- **Spec coverage:** every section of the original design spec (`docs/superpowers/specs/2026-06-19-job-matching-rewrite-design.md`) maps to a task — migration (Task 1), type/data hook (Task 2), matching types (Task 3), normalization (Task 4), 7 scorers + aggregator (Task 5), color ramp (Task 6), badge (Task 7), modal (Task 8), all 5 consumer surfaces (Tasks 9-11), the 5-card Objectifs page (Task 12), and build/lint/test verification (Task 13).
- **No placeholders:** every step that touches code includes the literal code to write; no "add appropriate handling" steps.
- **Type consistency:** `MatchResult`/`CategoryScores`/`MatchLevel`/`MatchConfidence` (Task 3) are used with identical field names across Tasks 5-12; `UserGoal` field renames (Task 2: `target_roles`, `locations`, plus new `target_title`/`sectors`/`keywords_wanted`/`keywords_excluded`/`experience_level`/`scoring_priorities`) are used consistently everywhere they're read, including the migration in Task 1.

