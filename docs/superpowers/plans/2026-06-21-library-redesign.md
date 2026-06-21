# Library Redesign (CV Hub + ATS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/library` page into a CV hub matching the provided screenshot: stored/scored CV documents, real AI-driven ATS analyses, a tabbed table of library elements, and an AI suggestions panel.

**Architecture:** Two new Supabase tables (`cv_documents`, `ats_analyses`) plus a new `"Experience"."sourceCvId"` column and a private `cv-documents` storage bucket. Two new hooks (`useCvDocuments`, `useAtsAnalyses`) wrap the new tables/bucket. Pure, testable helpers live in `src/lib/cvLibrary.ts` and `src/lib/cvTextExtraction.ts` (the latter extracted from the existing `CVImporter.tsx` so both import and re-analysis flows share one PDF/DOCX parser). New AI calls (`analyzeCvAts`, `generateLibrarySuggestions`) are added to the existing `src/lib/ai.ts`. `LibraryPage.tsx` is rewritten to assemble everything; `CVImporter.tsx` is extended (not replaced) to persist the uploaded file and tag extracted experiences with their source CV.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + Storage + RLS), `pdfjs-dist` / `mammoth` for text extraction, existing `generateStructuredData` AI wrapper (OpenAI via Supabase edge function), Vitest for pure-function tests, Tailwind + existing CSS variable design tokens.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-library-redesign-design.md` — follow it exactly; scope is the screenshot, not the full original wishlist.
- New tables use the modern snake_case pattern already established by `user_goals`/`tasks` (column names match 1:1 between DB and TS interface — no camelCase mapping layer). The legacy `"Experience"` table keeps its quoted camelCase convention; only the new `"sourceCvId"` column follows that existing table's style.
- Reuse existing CSS variables (`--color-primary`, `--color-accent`, `--color-border`, `--color-muted`, `--color-success`, `--color-warning`, `--color-danger`) — do not add a parallel color theme. `--color-success` (#059669) stands in for "score positif", `--color-warning` (#F59E0B) for mid scores, `--color-danger` (#EF4444) for low scores.
- This codebase only unit-tests pure functions in `src/lib/*.test.ts` via Vitest (no jsdom/React Testing Library setup exists — see `src/lib/favicon.test.ts`, `jobMatching.test.ts`, `goalDraft.test.ts`). Hooks and components (`useExperiences.ts`, `useProfile.ts`, `CVImporter.tsx`, `LibraryPage.tsx`) have no test files today. Follow that convention: tasks that touch only pure logic get real TDD steps; tasks that touch hooks/components end with a manual browser-verification step instead (`npm run dev`, exercise the feature), consistent with CLAUDE.md's "tester chaque fonctionnalité dans le navigateur avant de valider".
- Run `npm run lint` and `npm run build` (which runs `tsc`) at the end of every task that adds/changes TypeScript files — both must pass with zero errors/warnings before committing.
- "Dernière utilisation" in the Éléments de bibliothèque table is populated from `Experience.createdAt` (date the entry was added) — there is no usage-tracking subsystem in this scope (true "used in N CVs/letters" tracking is backlog per the spec).
- Migration files go in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`, applied with `npm run db:push` (reads `SUPABASE_ACCESS_TOKEN` from `.env.local`).

---

## File Map

**Create:**
- `supabase/migrations/20260621130000_add_cv_documents_and_ats_analyses.sql`
- `src/lib/cvLibrary.ts` + `src/lib/cvLibrary.test.ts`
- `src/lib/cvTextExtraction.ts`
- `src/hooks/useCvDocuments.ts`
- `src/hooks/useAtsAnalyses.ts`
- `src/components/library/ScoreRing.tsx`
- `src/components/library/CvCard.tsx`
- `src/components/library/AtsAnalysisRow.tsx`
- `src/components/library/NewAtsAnalysisModal.tsx`
- `src/components/library/AtsAnalysisDetailModal.tsx`
- `src/components/library/AssociateAnalysisModal.tsx`
- `src/components/library/CompareCvModal.tsx`
- `src/components/library/LibrarySuggestionsPanel.tsx`
- `src/components/library/LibraryElementsTable.tsx`

**Modify:**
- `src/lib/types.ts` (add `CvDocument`, `CvStatus`, `AtsAnalysis`; add `sourceCvId` to `Experience`)
- `src/hooks/useExperiences.ts` (add `sourceCvId` to `NewExperience`)
- `src/lib/ai.ts` (add `analyzeCvAts`, `generateLibrarySuggestions`)
- `src/components/library/CVImporter.tsx` (use shared `cvTextExtraction.ts`, upload file, tag `sourceCvId`)
- `src/pages/LibraryPage.tsx` (full layout rewrite)

---

### Task 1: Database migration — cv_documents, ats_analyses, Experience.sourceCvId, storage bucket

**Files:**
- Create: `supabase/migrations/20260621130000_add_cv_documents_and_ats_analyses.sql`

**Interfaces:**
- Produces: tables `public.cv_documents`, `public.ats_analyses`; column `public."Experience"."sourceCvId"`; storage bucket `cv-documents`. All later tasks depend on these existing.

- [ ] **Step 1: Write the migration file**

```sql
-- cv_documents: stores uploaded CV files (metadata) + latest ATS score
create table public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size integer not null,
  status text not null default 'to_review' check (status in ('active', 'to_review', 'archived')),
  ats_score integer check (ats_score is null or (ats_score >= 0 and ats_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_documents enable row level security;

create policy "cv_documents_owner_all" on public.cv_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ats_analyses: history of ATS analyses run against a stored CV
create table public.ats_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null references public.cv_documents(id) on delete cascade,
  application_id text, -- informal reference to "Application".id (legacy text PK, no cross-type FK)
  title text not null,
  job_description text,
  score integer not null check (score >= 0 and score <= 100),
  missing_keywords text[] not null default '{}',
  recommendations text,
  created_at timestamptz not null default now()
);

alter table public.ats_analyses enable row level security;

create policy "ats_analyses_owner_all" on public.ats_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Link extracted experiences back to the CV they came from (null = manual entry)
alter table public."Experience"
  add column "sourceCvId" uuid references public.cv_documents(id) on delete set null;

-- Private storage bucket for the original CV files
insert into storage.buckets (id, name, public)
values ('cv-documents', 'cv-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own cv documents" on storage.objects;
create policy "Users can read own cv documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own cv documents" on storage.objects;
create policy "Users can upload own cv documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own cv documents" on storage.objects;
create policy "Users can delete own cv documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

- [ ] **Step 2: Apply the migration**

Run: `npm run db:push`
Expected: output ends with `✅  1 migration(s) appliquée(s) avec succès.`

- [ ] **Step 3: Verify the schema landed**

Use `mcp__supabase__list_tables` (verbose) and confirm `public.cv_documents`, `public.ats_analyses` exist with the columns above, `public."Experience"` now has `"sourceCvId"`, and `rls_enabled: true` on both new tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260621130000_add_cv_documents_and_ats_analyses.sql
git commit -m "feat: add cv_documents/ats_analyses tables, Experience.sourceCvId, cv-documents bucket"
```

---

### Task 2: Types — CvDocument, AtsAnalysis, CvStatus, Experience.sourceCvId

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/hooks/useExperiences.ts`

**Interfaces:**
- Consumes: Task 1 schema (column names).
- Produces: `CvDocument`, `AtsAnalysis`, `CvStatus` types from `@/lib/types`; `NewExperience.sourceCvId: string | null` from `@/hooks/useExperiences`. Every later task that touches CV/analysis data imports these exact shapes.

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append after the `Experience` interface block:

```ts
// ─── Experience (cont.) ────────────────────────────────────────────────────
// sourceCvId added below via interface merge is not valid TS, so the field
// is added directly to the Experience interface above instead — see edit in
// the existing block.

// ─── CV Library ────────────────────────────────────────────────────────────

export type CvStatus = 'active' | 'to_review' | 'archived'

export interface CvDocument {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_type: 'pdf' | 'docx'
  file_size: number
  status: CvStatus
  ats_score: number | null
  created_at: string
  updated_at: string
}

export interface AtsAnalysis {
  id: string
  user_id: string
  cv_id: string
  application_id: string | null
  title: string
  job_description: string | null
  score: number
  missing_keywords: string[]
  recommendations: string | null
  created_at: string
}

export const CV_STATUS_LABELS: Record<CvStatus, string> = {
  active: 'Actif',
  to_review: 'À vérifier',
  archived: 'Archivé',
}
```

Then edit the existing `Experience` interface (around line 49-63) to add the new field:

```ts
export interface Experience {
  id: string
  userId: string
  type: ExperienceType
  title: string
  organization: string
  location: string | null
  startDate: string
  endDate: string | null
  current: boolean
  description: string | null
  skills: string[]
  subsection: string | null
  createdAt: string
  sourceCvId: string | null
}
```

- [ ] **Step 2: Add `sourceCvId` to `NewExperience` in `src/hooks/useExperiences.ts`**

```ts
export interface NewExperience {
  id: string
  userId: string
  type: ExperienceType
  title: string
  organization: string
  location: string | null
  startDate: string
  endDate: string | null
  current: boolean
  description: string | null
  skills: string[]
  subsection: string | null
  sourceCvId: string | null
}
```

- [ ] **Step 3: Fix the one existing call site that constructs a `NewExperience` without `sourceCvId`**

In `src/pages/LibraryPage.tsx`, the `ExperienceEditor`'s submit handler builds a `NewExperience` (manually-added entry). Add `sourceCvId: initial?.sourceCvId ?? null,` to that object literal — this is a one-line fix kept here because it's required for the project to typecheck after Step 2; the full `LibraryPage.tsx` rewrite happens in Task 16.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the Step 3 fix is what makes this pass — without it, `ExperienceEditor`'s object literal is missing a required property).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/hooks/useExperiences.ts src/pages/LibraryPage.tsx
git commit -m "feat: add CvDocument/AtsAnalysis types and Experience.sourceCvId"
```

---

### Task 3: Pure helpers — `src/lib/cvLibrary.ts`

**Files:**
- Create: `src/lib/cvLibrary.ts`
- Test: `src/lib/cvLibrary.test.ts`

**Interfaces:**
- Produces: `CV_MAX_SIZE_BYTES`, `validateCvFile(file)`, `scoreTone(score)`, `ringOffset(score, circumference)`, `computeLibraryStats(cvDocuments, atsAnalyses)`, `buildAtsAnalysisUserContent(cvText, jobTitle?, jobDescription?)`, `parseAtsAnalysisResponse(raw)`, `buildSuggestionsUserContent(experiences, cvDocuments)`, `parseSuggestionsResponse(raw)`. Tasks 4-16 import these by exact name.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/cvLibrary.test.ts
import { describe, it, expect } from 'vitest'
import {
  CV_MAX_SIZE_BYTES,
  validateCvFile,
  scoreTone,
  ringOffset,
  computeLibraryStats,
  buildAtsAnalysisUserContent,
  parseAtsAnalysisResponse,
  buildSuggestionsUserContent,
  parseSuggestionsResponse,
} from './cvLibrary'

describe('validateCvFile', () => {
  it('accepts a pdf under the size limit', () => {
    expect(validateCvFile({ name: 'cv.pdf', size: 1000, type: 'application/pdf' })).toBeNull()
  })

  it('accepts a docx by extension when mime type is generic', () => {
    expect(validateCvFile({ name: 'cv.docx', size: 1000, type: 'application/octet-stream' })).toBeNull()
  })

  it('rejects an unsupported format', () => {
    expect(validateCvFile({ name: 'cv.txt', size: 1000, type: 'text/plain' })).toMatch(/non supporté/)
  })

  it('rejects a file over the size limit', () => {
    expect(validateCvFile({ name: 'cv.pdf', size: CV_MAX_SIZE_BYTES + 1, type: 'application/pdf' })).toMatch(/lourd/)
  })
})

describe('scoreTone', () => {
  it('returns success at and above 75', () => {
    expect(scoreTone(75)).toBe('success')
    expect(scoreTone(100)).toBe('success')
  })
  it('returns warning between 50 and 74', () => {
    expect(scoreTone(50)).toBe('warning')
    expect(scoreTone(74)).toBe('warning')
  })
  it('returns danger below 50', () => {
    expect(scoreTone(0)).toBe('danger')
    expect(scoreTone(49)).toBe('danger')
  })
})

describe('ringOffset', () => {
  it('returns 0 offset (full ring) at score 100', () => {
    expect(ringOffset(100, 100)).toBe(0)
  })
  it('returns full circumference (empty ring) at score 0', () => {
    expect(ringOffset(0, 100)).toBe(100)
  })
  it('clamps out-of-range scores', () => {
    expect(ringOffset(150, 100)).toBe(0)
    expect(ringOffset(-20, 100)).toBe(100)
  })
})

describe('computeLibraryStats', () => {
  it('computes counts and average score from real rows', () => {
    const stats = computeLibraryStats(
      [{ ats_score: 80 }, { ats_score: 60 }, { ats_score: null }],
      [
        { score: 70, missing_keywords: ['a', 'b'] },
        { score: 90, missing_keywords: ['c'] },
      ],
    )
    expect(stats).toEqual({ cvCount: 3, analysisCount: 2, avgScore: 80, missingKeywordsCount: 3 })
  })

  it('returns null avgScore with no analyses', () => {
    const stats = computeLibraryStats([], [])
    expect(stats.avgScore).toBeNull()
    expect(stats.cvCount).toBe(0)
  })
})

describe('buildAtsAnalysisUserContent', () => {
  it('includes the cv text and omits job fields when absent', () => {
    const content = buildAtsAnalysisUserContent('mon cv')
    expect(content).toContain('mon cv')
    expect(content).not.toContain('Titre du poste')
  })

  it('includes job title and description when provided', () => {
    const content = buildAtsAnalysisUserContent('mon cv', 'Chef de projet', 'Description du poste')
    expect(content).toContain('Chef de projet')
    expect(content).toContain('Description du poste')
  })
})

describe('parseAtsAnalysisResponse', () => {
  it('parses a well-formed response', () => {
    const result = parseAtsAnalysisResponse({
      score: 78,
      missingKeywords: ['Scrum', 'Scrum', '  Agile  '],
      recommendations: '  Ajoutez des résultats chiffrés.  ',
    })
    expect(result).toEqual({
      score: 78,
      missingKeywords: ['Scrum', 'Agile'],
      recommendations: 'Ajoutez des résultats chiffrés.',
    })
  })

  it('clamps an out-of-range score and defaults missing fields', () => {
    const result = parseAtsAnalysisResponse({ score: 140 })
    expect(result).toEqual({ score: 100, missingKeywords: [], recommendations: '' })
  })

  it('handles a non-object response without throwing', () => {
    expect(parseAtsAnalysisResponse(null)).toEqual({ score: 0, missingKeywords: [], recommendations: '' })
  })
})

describe('buildSuggestionsUserContent', () => {
  it('lists experiences and cv documents', () => {
    const content = buildSuggestionsUserContent(
      [{ title: 'Dev', organization: 'Acme', skills: ['React'] }],
      [{ file_name: 'cv.pdf', ats_score: 72 }],
    )
    expect(content).toContain('Dev chez Acme')
    expect(content).toContain('cv.pdf')
  })

  it('shows fallback text with no data', () => {
    const content = buildSuggestionsUserContent([], [])
    expect(content).toContain('Aucune expérience')
    expect(content).toContain('Aucun CV')
  })
})

describe('parseSuggestionsResponse', () => {
  it('keeps up to 3 non-empty string suggestions', () => {
    const result = parseSuggestionsResponse({ suggestions: ['a', '', '  b  ', 'c', 'd'] })
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty array when suggestions is missing', () => {
    expect(parseSuggestionsResponse({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cvLibrary.test.ts`
Expected: FAIL — `Cannot find module './cvLibrary'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/lib/cvLibrary.ts`**

```ts
export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024

interface FileLike {
  name: string
  size: number
  type: string
}

export function validateCvFile(file: FileLike): string | null {
  const lowerName = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf')
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')

  if (!isPdf && !isDocx) return 'Format non supporté — PDF ou DOCX uniquement'
  if (file.size > CV_MAX_SIZE_BYTES) return 'Fichier trop lourd (max 5 Mo)'
  return null
}

export type ScoreTone = 'success' | 'warning' | 'danger'

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

export function ringOffset(score: number, circumference: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return circumference * (1 - clamped / 100)
}

interface CvLike {
  ats_score: number | null
}

interface AnalysisLike {
  score: number
  missing_keywords: string[]
}

export interface LibraryStats {
  cvCount: number
  analysisCount: number
  avgScore: number | null
  missingKeywordsCount: number
}

export function computeLibraryStats(cvDocuments: CvLike[], atsAnalyses: AnalysisLike[]): LibraryStats {
  const scores = atsAnalyses.map((a) => a.score)
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null
  const missingKeywordsCount = atsAnalyses.reduce((sum, a) => sum + a.missing_keywords.length, 0)
  return {
    cvCount: cvDocuments.length,
    analysisCount: atsAnalyses.length,
    avgScore,
    missingKeywordsCount,
  }
}

export function buildAtsAnalysisUserContent(cvText: string, jobTitle?: string, jobDescription?: string): string {
  const parts = [`CV :\n${cvText.slice(0, 12000)}`]
  if (jobTitle) parts.push(`Titre du poste ciblé : ${jobTitle}`)
  if (jobDescription) parts.push(`Description du poste :\n${jobDescription.slice(0, 4000)}`)
  return parts.join('\n\n')
}

export interface AtsAnalysisResult {
  score: number
  missingKeywords: string[]
  recommendations: string
}

function dedupeTrimmed(values: unknown[]): string[] {
  return [...new Set(
    values
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim()),
  )]
}

export function parseAtsAnalysisResponse(raw: unknown): AtsAnalysisResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawScore = typeof obj.score === 'number' ? obj.score : 0
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const missingKeywords = Array.isArray(obj.missingKeywords) ? dedupeTrimmed(obj.missingKeywords) : []
  const recommendations = typeof obj.recommendations === 'string' ? obj.recommendations.trim() : ''
  return { score, missingKeywords, recommendations }
}

interface ExperienceLike {
  title: string
  organization: string
  skills: string[]
}

interface CvDocLike {
  file_name: string
  ats_score: number | null
}

export function buildSuggestionsUserContent(experiences: ExperienceLike[], cvDocuments: CvDocLike[]): string {
  const expLines = experiences
    .slice(0, 15)
    .map((e) => `- ${e.title} chez ${e.organization} (${e.skills.join(', ')})`)
    .join('\n')
  const cvLines = cvDocuments
    .map((cv) => `- ${cv.file_name} (score ATS: ${cv.ats_score ?? 'inconnu'})`)
    .join('\n')
  return `Expériences :\n${expLines || 'Aucune expérience renseignée'}\n\nCV importés :\n${cvLines || 'Aucun CV importé'}`
}

export function parseSuggestionsResponse(raw: unknown): string[] {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!Array.isArray(obj.suggestions)) return []
  return dedupeTrimmed(obj.suggestions).slice(0, 3)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cvLibrary.test.ts`
Expected: PASS — all 16 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cvLibrary.ts src/lib/cvLibrary.test.ts
git commit -m "feat: add pure CV library helpers (validation, scoring, stats, AI prompt/response shaping)"
```

---

### Task 4: Shared text extraction — `src/lib/cvTextExtraction.ts`

**Files:**
- Create: `src/lib/cvTextExtraction.ts`
- Modify: `src/components/library/CVImporter.tsx` (use the shared module instead of its inline `extractTextFromPDF`/`extractTextFromDOCX`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `extractCvText(fileType: 'pdf' | 'docx', arrayBuffer: ArrayBuffer): Promise<string>`. Task 6 (`useCvDocuments`'s `getCvText`) and Task 10/CvCard's "Réanalyser" both call this with bytes downloaded from Supabase Storage; `CVImporter.tsx` calls it with bytes read from the just-picked `File`.

- [ ] **Step 1: Create the shared module**

```ts
// src/lib/cvTextExtraction.ts
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  GlobalWorkerOptions.workerSrc = workerUrl

  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n')
}

export async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function extractCvText(fileType: 'pdf' | 'docx', arrayBuffer: ArrayBuffer): Promise<string> {
  return fileType === 'pdf' ? extractTextFromPDF(arrayBuffer) : extractTextFromDOCX(arrayBuffer)
}
```

- [ ] **Step 2: Update `CVImporter.tsx` to use the shared module**

Remove the existing `extractTextFromPDF` and `extractTextFromDOCX` functions (lines 99-126) from `src/components/library/CVImporter.tsx` and replace the import line:

```ts
import { extractCvText } from '@/lib/cvTextExtraction'
```

Then update `handleFile` — replace:

```ts
      const text = isPDF ? await extractTextFromPDF(file) : await extractTextFromDOCX(file)
```

with:

```ts
      const arrayBuffer = await file.arrayBuffer()
      const text = await extractCvText(isPDF ? 'pdf' : 'docx', arrayBuffer)
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (the two removed functions are no longer referenced anywhere else in `CVImporter.tsx`).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/library`, click "Importer un CV", upload a real PDF or DOCX résumé. Expected: the existing extraction → preview flow still works exactly as before (this task only moved code, it didn't change behavior yet — file upload/storage comes in Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cvTextExtraction.ts src/components/library/CVImporter.tsx
git commit -m "refactor: extract CV text-extraction into a shared module for reuse beyond import"
```

---

### Task 5: AI functions — `analyzeCvAts`, `generateLibrarySuggestions`

**Files:**
- Modify: `src/lib/ai.ts`

**Interfaces:**
- Consumes: `buildAtsAnalysisUserContent`, `parseAtsAnalysisResponse`, `buildSuggestionsUserContent`, `parseSuggestionsResponse`, `AtsAnalysisResult` from `@/lib/cvLibrary` (Task 3); `generateStructuredData` (already in this file).
- Produces: `analyzeCvAts(input: { cvText: string; jobTitle?: string; jobDescription?: string }): Promise<AtsAnalysisResult>` and `generateLibrarySuggestions(input: { experiences: { title: string; organization: string; skills: string[] }[]; cvDocuments: { file_name: string; ats_score: number | null }[] }): Promise<string[]>`. Tasks 6, 11, and 14 call these by exact name/signature.

- [ ] **Step 1: Add the two functions to `src/lib/ai.ts`**

Add this import at the top of the file:

```ts
import {
  buildAtsAnalysisUserContent,
  parseAtsAnalysisResponse,
  buildSuggestionsUserContent,
  parseSuggestionsResponse,
  type AtsAnalysisResult,
} from './cvLibrary'
```

Append at the end of the file:

```ts
const ATS_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert en optimisation de CV pour les systèmes ATS (Applicant Tracking System).
Analyse le CV fourni (et la description de poste si elle est donnée) et évalue sa compatibilité ATS.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format :
{
  "score": number (0 à 100, compatibilité ATS globale),
  "missingKeywords": ["string"] (mots-clés importants absents du CV, déduits de la description de poste si fournie, sinon des standards du métier détecté),
  "recommendations": "string (2 à 4 phrases de recommandations concrètes pour améliorer le score)"
}
Contraintes : n'invente pas de mots-clés non pertinents, base-toi uniquement sur le contenu fourni.`

export async function analyzeCvAts(input: {
  cvText: string
  jobTitle?: string
  jobDescription?: string
}): Promise<AtsAnalysisResult> {
  const userContent = buildAtsAnalysisUserContent(input.cvText, input.jobTitle, input.jobDescription)
  const raw = await generateStructuredData<unknown>(ATS_ANALYSIS_SYSTEM_PROMPT, userContent, 1200)
  return parseAtsAnalysisResponse(raw)
}

const LIBRARY_SUGGESTIONS_SYSTEM_PROMPT = `Tu es un conseiller carrière qui analyse la bibliothèque d'expériences et de CV d'un utilisateur.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format :
{ "suggestions": ["string"] }
Donne 2 à 3 suggestions courtes et actionnables (compétences à renforcer, expériences à valoriser, ou CV à mettre à jour). N'invente pas de faits sur l'utilisateur, base-toi uniquement sur les données fournies.`

export async function generateLibrarySuggestions(input: {
  experiences: { title: string; organization: string; skills: string[] }[]
  cvDocuments: { file_name: string; ats_score: number | null }[]
}): Promise<string[]> {
  const userContent = buildSuggestionsUserContent(input.experiences, input.cvDocuments)
  const raw = await generateStructuredData<unknown>(LIBRARY_SUGGESTIONS_SYSTEM_PROMPT, userContent, 600)
  return parseSuggestionsResponse(raw)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (No new automated test here — `analyzeCvAts`/`generateLibrarySuggestions` are thin network-calling wrappers around already-tested pure functions; this matches how `generateGoalFromText` in the same file has no dedicated test.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: add analyzeCvAts and generateLibrarySuggestions AI functions"
```

---

### Task 6: `useCvDocuments` hook

**Files:**
- Create: `src/hooks/useCvDocuments.ts`

**Interfaces:**
- Consumes: `CvDocument`, `CvStatus` from `@/lib/types` (Task 2); `validateCvFile` from `@/lib/cvLibrary` (Task 3); `extractCvText` from `@/lib/cvTextExtraction` (Task 4); `analyzeCvAts` from `@/lib/ai` (Task 5); `supabase` from `@/lib/supabase`.
- Produces: `useCvDocuments(userId: string | null)` returning `{ cvDocuments: CvDocument[], loading, error, uploadCv(file: File): Promise<{ data: CvDocument | null; error: string | null }>, updateStatus(id: string, status: CvStatus): Promise<string | null>, updateAtsScore(id: string, score: number): Promise<string | null>, deleteCv(id: string): Promise<string | null>, getSignedUrl(filePath: string): Promise<string | null>, getCvText(cv: CvDocument): Promise<string>, reanalyze(cv: CvDocument): Promise<string | null>, refetch }`. Tasks 9, 10, 11, 16 use these exact names.

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useCvDocuments.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { CvDocument, CvStatus } from '@/lib/types'
import { validateCvFile } from '@/lib/cvLibrary'
import { extractCvText } from '@/lib/cvTextExtraction'
import { analyzeCvAts } from '@/lib/ai'

export function useCvDocuments(userId: string | null) {
  const [cvDocuments, setCvDocuments] = useState<CvDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCvDocuments = useCallback(async () => {
    if (!userId) { setCvDocuments([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('cv_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCvDocuments(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCvDocuments() }, [fetchCvDocuments])

  async function uploadCv(file: File): Promise<{ data: CvDocument | null; error: string | null }> {
    if (!userId) return { data: null, error: 'Non authentifié' }

    const validationError = validateCvFile(file)
    if (validationError) return { data: null, error: validationError }

    const id = crypto.randomUUID()
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
    const filePath = `${userId}/${id}/${file.name}`

    const { error: uploadError } = await supabase.storage.from('cv-documents').upload(filePath, file)
    if (uploadError) return { data: null, error: `Erreur d'upload : ${uploadError.message}` }

    const { data, error } = await supabase
      .from('cv_documents')
      .insert({
        id,
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        status: 'to_review',
      })
      .select()
      .single()

    if (error) {
      await supabase.storage.from('cv-documents').remove([filePath])
      return { data: null, error: error.message }
    }

    setCvDocuments((prev) => [data, ...prev])
    return { data, error: null }
  }

  async function updateStatus(id: string, status: CvStatus): Promise<string | null> {
    const { data, error } = await supabase
      .from('cv_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setCvDocuments((prev) => prev.map((cv) => (cv.id === id ? data : cv)))
    return null
  }

  async function updateAtsScore(id: string, score: number): Promise<string | null> {
    const { data, error } = await supabase
      .from('cv_documents')
      .update({ ats_score: score, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setCvDocuments((prev) => prev.map((cv) => (cv.id === id ? data : cv)))
    return null
  }

  async function deleteCv(id: string): Promise<string | null> {
    const cv = cvDocuments.find((c) => c.id === id)
    if (!cv) return 'CV introuvable'
    const { error: storageError } = await supabase.storage.from('cv-documents').remove([cv.file_path])
    if (storageError) return storageError.message
    const { error } = await supabase.from('cv_documents').delete().eq('id', id)
    if (error) return error.message
    setCvDocuments((prev) => prev.filter((c) => c.id !== id))
    return null
  }

  async function getSignedUrl(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('cv-documents').createSignedUrl(filePath, 60 * 5)
    if (error) return null
    return data.signedUrl
  }

  async function getCvText(cv: CvDocument): Promise<string> {
    const { data, error } = await supabase.storage.from('cv-documents').download(cv.file_path)
    if (error || !data) throw new Error(error?.message ?? 'Téléchargement du CV impossible')
    const arrayBuffer = await data.arrayBuffer()
    return extractCvText(cv.file_type, arrayBuffer)
  }

  async function reanalyze(cv: CvDocument): Promise<string | null> {
    try {
      const cvText = await getCvText(cv)
      const result = await analyzeCvAts({ cvText })
      return updateAtsScore(cv.id, result.score)
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur inattendue'
    }
  }

  return {
    cvDocuments,
    loading,
    error,
    uploadCv,
    updateStatus,
    updateAtsScore,
    deleteCv,
    getSignedUrl,
    getCvText,
    reanalyze,
    refetch: fetchCvDocuments,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (will be exercised fully once wired into the UI in Task 16)**

For now, confirm the file compiles and exports the expected shape — no UI to click yet. Run: `npx tsc --noEmit --listFiles | grep useCvDocuments` to confirm it's part of the compiled graph.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCvDocuments.ts
git commit -m "feat: add useCvDocuments hook (upload, status, scoring, signed URLs, re-analysis)"
```

---

### Task 7: `useAtsAnalyses` hook

**Files:**
- Create: `src/hooks/useAtsAnalyses.ts`

**Interfaces:**
- Consumes: `AtsAnalysis` from `@/lib/types` (Task 2); `analyzeCvAts` from `@/lib/ai` (Task 5); `supabase` from `@/lib/supabase`.
- Produces: `useAtsAnalyses(userId: string | null)` returning `{ atsAnalyses: AtsAnalysis[], loading, error, createAnalysis(input: { cvId: string; cvText: string; title: string; jobTitle?: string; jobDescription?: string }): Promise<{ data: AtsAnalysis | null; error: string | null }>, generateRecommendations(id: string, cvText: string): Promise<string | null>, associateToApplication(id: string, applicationId: string | null): Promise<string | null>, refetch }`. Tasks 11, 12, 13, 16 use these exact names.

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useAtsAnalyses.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AtsAnalysis } from '@/lib/types'
import { analyzeCvAts } from '@/lib/ai'

export function useAtsAnalyses(userId: string | null) {
  const [atsAnalyses, setAtsAnalyses] = useState<AtsAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAtsAnalyses = useCallback(async () => {
    if (!userId) { setAtsAnalyses([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('ats_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setAtsAnalyses(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAtsAnalyses() }, [fetchAtsAnalyses])

  async function createAnalysis(input: {
    cvId: string
    cvText: string
    title: string
    jobTitle?: string
    jobDescription?: string
  }): Promise<{ data: AtsAnalysis | null; error: string | null }> {
    if (!userId) return { data: null, error: 'Non authentifié' }

    try {
      const result = await analyzeCvAts({
        cvText: input.cvText,
        jobTitle: input.jobTitle,
        jobDescription: input.jobDescription,
      })

      const { data, error } = await supabase
        .from('ats_analyses')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          cv_id: input.cvId,
          title: input.title,
          job_description: input.jobDescription ?? null,
          score: result.score,
          missing_keywords: result.missingKeywords,
          recommendations: result.recommendations,
        })
        .select()
        .single()

      if (error) return { data: null, error: error.message }
      setAtsAnalyses((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erreur inattendue' }
    }
  }

  async function generateRecommendations(id: string, cvText: string): Promise<string | null> {
    const analysis = atsAnalyses.find((a) => a.id === id)
    if (!analysis) return 'Analyse introuvable'
    if (analysis.recommendations) return null

    try {
      const result = await analyzeCvAts({
        cvText,
        jobDescription: analysis.job_description ?? undefined,
      })
      const { data, error } = await supabase
        .from('ats_analyses')
        .update({ recommendations: result.recommendations })
        .eq('id', id)
        .select()
        .single()
      if (error) return error.message
      setAtsAnalyses((prev) => prev.map((a) => (a.id === id ? data : a)))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur inattendue'
    }
  }

  async function associateToApplication(id: string, applicationId: string | null): Promise<string | null> {
    const { data, error } = await supabase
      .from('ats_analyses')
      .update({ application_id: applicationId })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setAtsAnalyses((prev) => prev.map((a) => (a.id === id ? data : a)))
    return null
  }

  return {
    atsAnalyses,
    loading,
    error,
    createAnalysis,
    generateRecommendations,
    associateToApplication,
    refetch: fetchAtsAnalyses,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAtsAnalyses.ts
git commit -m "feat: add useAtsAnalyses hook (create via AI, lazy recommendations, application linking)"
```

---

### Task 8: `ScoreRing` component

**Files:**
- Create: `src/components/library/ScoreRing.tsx`

**Interfaces:**
- Consumes: `scoreTone`, `ringOffset` from `@/lib/cvLibrary` (Task 3).
- Produces: `<ScoreRing score={number} size?={number} />`. Tasks 10, 11, 13 render this for every CV/analysis score badge.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/ScoreRing.tsx
import { scoreTone, ringOffset } from '@/lib/cvLibrary'

interface ScoreRingProps {
  score: number
  size?: number
}

const TONE_COLOR: Record<string, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}

export function ScoreRing({ score, size = 44 }: ScoreRingProps) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = ringOffset(score, circumference)
  const tone = scoreTone(score)
  const center = size / 2

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={TONE_COLOR[tone]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color: TONE_COLOR[tone] }}>{score}%</span>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/ScoreRing.tsx
git commit -m "feat: add ScoreRing component for CV/analysis score badges"
```

---

### Task 9: Wire CV upload + sourceCvId tagging into `CVImporter.tsx`

**Files:**
- Modify: `src/components/library/CVImporter.tsx`
- Modify: `src/pages/LibraryPage.tsx` (only the `<CVImporter />` invocation — pass the new prop; the rest of the page rewrite happens in Task 16)

**Interfaces:**
- Consumes: `useCvDocuments().uploadCv` (Task 6) — passed in as a prop, the component does not call the hook directly (keeps `CVImporter` a dumb/controlled component, matching its existing style where `onImportEntries`/`onImportProfileData` are also injected).
- Produces: `CVImporterProps.onUploadCv: (file: File) => Promise<{ data: CvDocument | null; error: string | null }>` (new required prop). Task 16 wires this from `useCvDocuments`.

- [ ] **Step 1: Add the new prop and keep the picked `File` in state**

In `src/components/library/CVImporter.tsx`, add the import and extend the props interface:

```ts
import type { CvDocument } from '@/lib/types'
```

```ts
interface CVImporterProps {
  userId: string
  existingSkills: string[]
  existingInterests: string[]
  onImportEntries: (items: NewExperience[]) => Promise<string | null>
  onImportProfileData: (payload: { skills: string[]; interests: string[] }) => Promise<string | null>
  onUploadCv: (file: File) => Promise<{ data: CvDocument | null; error: string | null }>
  onClose: () => void
}
```

Add a new piece of state right after the existing `useState` calls in the component body:

```ts
const [pickedFile, setPickedFile] = useState<File | null>(null)
```

In `handleFile`, store the file at the very start (right after the size/type checks pass, before `setStep('loading')`):

```ts
    setError(null)
    setPickedFile(file)
    setStep('loading')
```

- [ ] **Step 2: Upload the file and tag entries with the resulting CV id in `handleConfirm`**

Replace the start of `handleConfirm`:

```ts
  async function handleConfirm() {
    const selectedEntries = entries.filter((entry) => entry.selected)
    setStep('saving')

    if (!pickedFile) {
      setError('Fichier introuvable, veuillez réimporter votre CV.')
      setStep('preview')
      return
    }

    const { data: cvDocument, error: uploadError } = await onUploadCv(pickedFile)
    if (uploadError || !cvDocument) {
      setError(uploadError ?? "Échec de l'enregistrement du CV")
      setStep('preview')
      return
    }

    const mapped: NewExperience[] = selectedEntries.map((entry) => ({
      id: crypto.randomUUID(),
      userId,
      type: mapType(entry.type),
      title: entry.title.trim(),
      organization: entry.organization.trim(),
      location: entry.location?.trim() || null,
      startDate: toDateStr(entry.startDate) ?? new Date().toISOString().slice(0, 10),
      endDate: entry.isCurrent ? null : toDateStr(entry.endDate),
      current: entry.isCurrent,
      description: entry.description.trim() || null,
      skills: dedupe(entry.skills),
      subsection: entry.subsection?.trim() || null,
      sourceCvId: cvDocument.id,
    }))
```

(this replaces the previous `const mapped: NewExperience[] = ...` block — the rest of `handleConfirm`, starting from `const nextSkills = dedupe(skillsText.split(','))`, stays unchanged except `sourceCvId` is now present on every mapped entry).

- [ ] **Step 3: Destructure the new prop**

Update the component signature:

```ts
export function CVImporter({
  userId,
  existingSkills,
  existingInterests,
  onImportEntries,
  onImportProfileData,
  onUploadCv,
  onClose,
}: CVImporterProps) {
```

- [ ] **Step 4: Pass a temporary prop from `LibraryPage.tsx` so the app still compiles**

In `src/pages/LibraryPage.tsx`, find the `<CVImporter ... />` block and add:

```tsx
onUploadCv={async () => ({ data: null, error: 'Stockage des CV non encore branché' })}
```

(this is a deliberate placeholder *prop wiring*, not a placeholder in the plan — Task 16 replaces it with the real `useCvDocuments().uploadCv`; until then this keeps the app buildable and the existing import flow will simply show that error if exercised, which is acceptable since Task 16 lands in the same work session.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/library/CVImporter.tsx src/pages/LibraryPage.tsx
git commit -m "feat: upload original CV file and tag extracted experiences with sourceCvId"
```

---

### Task 10: `CvCard` component ("Mes CV" row)

**Files:**
- Create: `src/components/library/CvCard.tsx`

**Interfaces:**
- Consumes: `CvDocument`, `CV_STATUS_LABELS` from `@/lib/types` (Task 2); `<ScoreRing />` from `@/components/library/ScoreRing` (Task 8); `formatDate` from `@/lib/utils` (existing).
- Produces: `<CvCard cv={CvDocument} onOpen onDownload onReanalyze onSetStatus onDelete />`. Task 18 (LibraryPage) renders one per `cvDocuments` entry.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/CvCard.tsx
import { useEffect, useRef, useState } from 'react'
import { FileText, Eye, Download, MoreVertical, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CV_STATUS_LABELS, type CvDocument, type CvStatus } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface CvCardProps {
  cv: CvDocument
  onOpen: (cv: CvDocument) => void
  onDownload: (cv: CvDocument) => void
  onReanalyze: (cv: CvDocument) => Promise<void>
  onSetStatus: (id: string, status: CvStatus) => void
  onDelete: (id: string) => void
}

const STATUS_BADGE_CLASS: Record<CvStatus, string> = {
  active: 'bg-green-100 text-green-700',
  to_review: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-600',
}

export function CvCard({ cv, onOpen, onDownload, onReanalyze, onSetStatus, onDelete }: CvCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-3 py-3 bg-white/72"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <FileText size={20} className="text-[var(--color-muted)] shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-[var(--color-deep-space)]">{cv.file_name}</p>
        <p className="text-xs text-[var(--color-muted)]">Mis à jour le {formatDate(cv.updated_at)}</p>
      </div>

      {cv.ats_score !== null ? <ScoreRing score={cv.ats_score} size={36} /> : (
        <span className="text-xs text-[var(--color-muted)] w-9 text-center">—</span>
      )}

      <span className={`badge ${STATUS_BADGE_CLASS[cv.status]}`}>{CV_STATUS_LABELS[cv.status]}</span>

      <button className="btn btn-ghost p-2" title="Ouvrir" onClick={() => onOpen(cv)}>
        <Eye size={15} />
      </button>
      <button className="btn btn-ghost p-2" title="Télécharger" onClick={() => onDownload(cv)}>
        <Download size={15} />
      </button>

      <div ref={menuRef} className="relative">
        <button className="btn btn-ghost p-2" onClick={() => setMenuOpen((v) => !v)}>
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-44 bg-white rounded-[10px] border shadow-lg z-10"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] flex items-center gap-2 disabled:opacity-50"
              disabled={reanalyzing}
              onClick={async () => {
                setReanalyzing(true)
                await onReanalyze(cv)
                setReanalyzing(false)
                setMenuOpen(false)
              }}
            >
              {reanalyzing && <Loader2 size={12} className="animate-spin" />}
              Réanalyser
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onSetStatus(cv.id, 'active'); setMenuOpen(false) }}
            >
              Marquer comme actif
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onSetStatus(cv.id, 'archived'); setMenuOpen(false) }}
            >
              Archiver
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onDelete(cv.id); setMenuOpen(false) }}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/CvCard.tsx
git commit -m "feat: add CvCard component for the Mes CV section"
```

---

### Task 11: `AtsAnalysisRow` component ("Analyses ATS récentes" row)

**Files:**
- Create: `src/components/library/AtsAnalysisRow.tsx`

**Interfaces:**
- Consumes: `AtsAnalysis` from `@/lib/types` (Task 2); `<ScoreRing />` (Task 8); `formatDate` from `@/lib/utils`.
- Produces: `<AtsAnalysisRow analysis cvFileName onView onOptimize onAssociate />`. Task 18 renders one per `atsAnalyses` entry.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/AtsAnalysisRow.tsx
import { formatDate } from '@/lib/utils'
import type { AtsAnalysis } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface AtsAnalysisRowProps {
  analysis: AtsAnalysis
  cvFileName: string
  onView: (analysis: AtsAnalysis) => void
  onOptimize: (analysis: AtsAnalysis) => void
  onAssociate: (analysis: AtsAnalysis) => void
}

export function AtsAnalysisRow({ analysis, cvFileName, onView, onOptimize, onAssociate }: AtsAnalysisRowProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-3 py-3 bg-white/72"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-[var(--color-deep-space)]">{analysis.title}</p>
        <p className="text-xs text-[var(--color-muted)] truncate">
          CV utilisé : {cvFileName} · Analysé le {formatDate(analysis.created_at)}
        </p>
      </div>

      <ScoreRing score={analysis.score} size={36} />

      <span className="text-xs text-[var(--color-muted)] w-28 text-right">
        {analysis.missing_keywords.length} mot{analysis.missing_keywords.length === 1 ? '' : 's'}-clés manquant{analysis.missing_keywords.length === 1 ? '' : 's'}
      </span>

      <button className="btn btn-secondary btn-sm" onClick={() => onView(analysis)}>Voir</button>
      <button className="btn btn-secondary btn-sm" onClick={() => onOptimize(analysis)}>Optimiser</button>
      <button className="btn btn-secondary btn-sm" onClick={() => onAssociate(analysis)}>Associer</button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/AtsAnalysisRow.tsx
git commit -m "feat: add AtsAnalysisRow component for the Analyses ATS récentes section"
```

---

### Task 12: `NewAtsAnalysisModal` component

**Files:**
- Create: `src/components/library/NewAtsAnalysisModal.tsx`

**Interfaces:**
- Consumes: `CvDocument` from `@/lib/types` (Task 2).
- Produces: `<NewAtsAnalysisModal cvDocuments onSubmit onClose />` where `onSubmit: (input: { cvId: string; title: string; jobTitle?: string; jobDescription?: string }) => Promise<string | null>`. Task 18 supplies `onSubmit` as a combined handler that calls `useCvDocuments().getCvText` → `useAtsAnalyses().createAnalysis` → `useCvDocuments().updateAtsScore`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/NewAtsAnalysisModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { CvDocument } from '@/lib/types'

interface NewAtsAnalysisModalProps {
  cvDocuments: CvDocument[]
  onSubmit: (input: { cvId: string; title: string; jobTitle?: string; jobDescription?: string }) => Promise<string | null>
  onClose: () => void
}

export function NewAtsAnalysisModal({ cvDocuments, onSubmit, onClose }: NewAtsAnalysisModalProps) {
  const [cvId, setCvId] = useState(cvDocuments[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Nouvelle analyse ATS</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!cvId) { setError('Sélectionnez un CV.'); return }
            setSubmitting(true)
            const err = await onSubmit({
              cvId,
              title: title.trim() || `Analyse — ${cvDocuments.find((cv) => cv.id === cvId)?.file_name ?? ''}`,
              jobTitle: jobTitle.trim() || undefined,
              jobDescription: jobDescription.trim() || undefined,
            })
            setSubmitting(false)
            if (err) setError(err)
            else onClose()
          }}
        >
          {cvDocuments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez d'abord un CV pour lancer une analyse.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">CV à analyser</span>
                <select className="input" value={cvId} onChange={(e) => setCvId(e.target.value)}>
                  {cvDocuments.map((cv) => (
                    <option key={cv.id} value={cv.id}>{cv.file_name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Nom de l'analyse (optionnel)</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Chef de projet Innovation" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Titre du poste ciblé (optionnel)</span>
                <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Description du poste (optionnel)</span>
                <textarea className="input resize-y min-h-28" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
              </label>
            </>
          )}

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting || cvDocuments.length === 0}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Lancer l'analyse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/NewAtsAnalysisModal.tsx
git commit -m "feat: add NewAtsAnalysisModal for launching an ATS analysis"
```

---

### Task 13: `AtsAnalysisDetailModal` component (Voir / Optimiser)

**Files:**
- Create: `src/components/library/AtsAnalysisDetailModal.tsx`

**Interfaces:**
- Consumes: `AtsAnalysis` from `@/lib/types` (Task 2); `<ScoreRing />` (Task 8); `formatDate` from `@/lib/utils`.
- Produces: `<AtsAnalysisDetailModal analysis mode={'view' | 'optimize'} cvFileName onGenerateRecommendations onClose />` where `onGenerateRecommendations: (id: string) => Promise<string | null>`. Task 18 passes the live `analysis` object from its own state so the modal reflects newly-generated recommendations after the parent re-renders.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/AtsAnalysisDetailModal.tsx
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AtsAnalysis } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface AtsAnalysisDetailModalProps {
  analysis: AtsAnalysis
  cvFileName: string
  mode: 'view' | 'optimize'
  onGenerateRecommendations: (id: string) => Promise<string | null>
  onClose: () => void
}

export function AtsAnalysisDetailModal({
  analysis,
  cvFileName,
  mode,
  onGenerateRecommendations,
  onClose,
}: AtsAnalysisDetailModalProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'optimize' || analysis.recommendations) return
    setGenerating(true)
    onGenerateRecommendations(analysis.id)
      .then((err) => setError(err))
      .finally(() => setGenerating(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, analysis.id])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">{analysis.title}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={analysis.score} size={56} />
            <div>
              <p className="text-sm font-semibold">{cvFileName}</p>
              <p className="text-xs text-[var(--color-muted)]">Analysé le {formatDate(analysis.created_at)}</p>
            </div>
          </div>

          {analysis.job_description && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Description du poste</p>
              <p className="text-sm whitespace-pre-wrap">{analysis.job_description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Mots-clés manquants</p>
            {analysis.missing_keywords.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Aucun mot-clé manquant détecté.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_keywords.map((kw) => (
                  <span key={kw} className="badge bg-amber-100 text-amber-700">{kw}</span>
                ))}
              </div>
            )}
          </div>

          {mode === 'optimize' && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Recommandations</p>
              {generating ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <Loader2 size={14} className="animate-spin" />
                  Génération des recommandations…
                </div>
              ) : error ? (
                <p className="text-sm text-[var(--color-danger)]">{error}</p>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{analysis.recommendations}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/AtsAnalysisDetailModal.tsx
git commit -m "feat: add AtsAnalysisDetailModal for viewing and optimizing an ATS analysis"
```

---

### Task 14: `AssociateAnalysisModal` component

**Files:**
- Create: `src/components/library/AssociateAnalysisModal.tsx`

**Interfaces:**
- Consumes: `AtsAnalysis` from `@/lib/types` (Task 2); `Application` from `@/lib/types` (existing).
- Produces: `<AssociateAnalysisModal analysis applications onAssociate onClose />` where `onAssociate: (analysisId: string, applicationId: string | null) => Promise<string | null>`. Task 18 wires this to `useAtsAnalyses().associateToApplication` and supplies `applications` from `useApplications()`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/AssociateAnalysisModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { AtsAnalysis, Application } from '@/lib/types'

interface AssociateAnalysisModalProps {
  analysis: AtsAnalysis
  applications: Application[]
  onAssociate: (analysisId: string, applicationId: string | null) => Promise<string | null>
  onClose: () => void
}

export function AssociateAnalysisModal({ analysis, applications, onAssociate, onClose }: AssociateAnalysisModalProps) {
  const [applicationId, setApplicationId] = useState(analysis.application_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Associer "{analysis.title}" à une candidature</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            const err = await onAssociate(analysis.id, applicationId || null)
            setSubmitting(false)
            if (err) setError(err)
            else onClose()
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Candidature</span>
            <select className="input" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
              <option value="">Aucune</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.company} — {app.position}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Associer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/AssociateAnalysisModal.tsx
git commit -m "feat: add AssociateAnalysisModal for linking an analysis to an application"
```

---

### Task 15: `CompareCvModal` component

**Files:**
- Create: `src/components/library/CompareCvModal.tsx`

**Interfaces:**
- Consumes: `CvDocument`, `Experience`, `CV_STATUS_LABELS` from `@/lib/types` (Task 2/existing); `formatDate` from `@/lib/utils`.
- Produces: `<CompareCvModal cvDocuments experiences onClose />`. Task 18 renders this when "Comparer 2 CV" is clicked.

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/CompareCvModal.tsx
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CV_STATUS_LABELS, type CvDocument, type Experience } from '@/lib/types'

interface CompareCvModalProps {
  cvDocuments: CvDocument[]
  experiences: Experience[]
  onClose: () => void
}

function cvMetrics(cv: CvDocument | undefined, experiences: Experience[]) {
  if (!cv) return null
  const linked = experiences.filter((exp) => exp.sourceCvId === cv.id)
  const skillsCount = new Set(linked.flatMap((exp) => exp.skills)).size
  return {
    score: cv.ats_score,
    status: CV_STATUS_LABELS[cv.status],
    importedAt: formatDate(cv.created_at),
    experienceCount: linked.length,
    skillsCount,
  }
}

export function CompareCvModal({ cvDocuments, experiences, onClose }: CompareCvModalProps) {
  const [idA, setIdA] = useState(cvDocuments[0]?.id ?? '')
  const [idB, setIdB] = useState(cvDocuments[1]?.id ?? cvDocuments[0]?.id ?? '')

  const cvA = cvDocuments.find((cv) => cv.id === idA)
  const cvB = cvDocuments.find((cv) => cv.id === idB)
  const metricsA = useMemo(() => cvMetrics(cvA, experiences), [cvA, experiences])
  const metricsB = useMemo(() => cvMetrics(cvB, experiences), [cvB, experiences])

  const rows: Array<{ label: string; a: string; b: string }> = metricsA && metricsB ? [
    { label: 'Score ATS', a: metricsA.score !== null ? `${metricsA.score}%` : '—', b: metricsB.score !== null ? `${metricsB.score}%` : '—' },
    { label: 'Statut', a: metricsA.status, b: metricsB.status },
    { label: "Date d'import", a: metricsA.importedAt, b: metricsB.importedAt },
    { label: 'Expériences liées', a: String(metricsA.experienceCount), b: String(metricsB.experienceCount) },
    { label: 'Compétences détectées', a: String(metricsA.skillsCount), b: String(metricsB.skillsCount) },
  ] : []

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Comparer deux CV</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {cvDocuments.length < 2 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez au moins deux CV pour pouvoir les comparer.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <select className="input" value={idA} onChange={(e) => setIdA(e.target.value)}>
                  {cvDocuments.map((cv) => <option key={cv.id} value={cv.id}>{cv.file_name}</option>)}
                </select>
                <select className="input" value={idB} onChange={(e) => setIdB(e.target.value)}>
                  {cvDocuments.map((cv) => <option key={cv.id} value={cv.id}>{cv.file_name}</option>)}
                </select>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2 text-[var(--color-muted)] text-xs font-semibold uppercase">{row.label}</td>
                      <td className="py-2 text-center">{row.a}</td>
                      <td className="py-2 text-center">{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/CompareCvModal.tsx
git commit -m "feat: add CompareCvModal for side-by-side CV metadata comparison"
```

---

### Task 16: `LibrarySuggestionsPanel` component

**Files:**
- Create: `src/components/library/LibrarySuggestionsPanel.tsx`

**Interfaces:**
- Consumes: `generateLibrarySuggestions` from `@/lib/ai` (Task 5); `Experience`, `CvDocument` from `@/lib/types`.
- Produces: `<LibrarySuggestionsPanel experiences cvDocuments />`. Task 18 renders this directly (it is self-contained — no parent state needed, matching the spec's "no persistence" decision).

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/LibrarySuggestionsPanel.tsx
import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateLibrarySuggestions } from '@/lib/ai'
import type { Experience, CvDocument } from '@/lib/types'

interface LibrarySuggestionsPanelProps {
  experiences: Experience[]
  cvDocuments: CvDocument[]
}

export function LibrarySuggestionsPanel({ experiences, cvDocuments }: LibrarySuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateLibrarySuggestions({
        experiences: experiences.map((e) => ({ title: e.title, organization: e.organization, skills: e.skills })),
        cvDocuments: cvDocuments.map((cv) => ({ file_name: cv.file_name, ats_score: cv.ats_score })),
      })
      setSuggestions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card px-5 py-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Suggestions IA</h2>
        <span className="badge bg-purple-100 text-purple-700">Béta</span>
      </div>

      {suggestions.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {suggestions.map((s, i) => (
            <li key={i} className="flex gap-2">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          L'IA analyse vos CV et vos expériences pour vous suggérer des compétences à renforcer ou des expériences à valoriser.
        </p>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <button className="btn btn-primary flex items-center gap-2 self-start" onClick={handleGenerate} disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Lancer une analyse IA
      </button>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/LibrarySuggestionsPanel.tsx
git commit -m "feat: add LibrarySuggestionsPanel with on-demand AI suggestions"
```

---

### Task 17: `LibraryElementsTable` component (replaces card-list rendering)

**Files:**
- Create: `src/components/library/LibraryElementsTable.tsx`

**Interfaces:**
- Consumes: `Experience`, `CvDocument` from `@/lib/types`; `formatDate` from `@/lib/utils`.
- Produces: `<LibraryElementsTable items={Experience[]} cvDocuments={CvDocument[]} typeLabel={(exp: Experience) => string} onEdit onDelete emptyTitle emptyText />`. Task 18 uses this for the Expériences and Formations tabs (Compétences/Centres d'intérêt keep their existing `ChipSection` rendering, per the design's note that those two tabs don't carry per-item type/source/usage metadata).

- [ ] **Step 1: Write the component**

```tsx
// src/components/library/LibraryElementsTable.tsx
import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Experience, CvDocument } from '@/lib/types'

interface LibraryElementsTableProps {
  items: Experience[]
  cvDocuments: CvDocument[]
  typeLabel: (exp: Experience) => string
  onEdit: (exp: Experience) => void
  onDelete: (id: string) => Promise<string | null>
  emptyTitle: string
  emptyText: string
}

export function LibraryElementsTable({
  items,
  cvDocuments,
  typeLabel,
  onEdit,
  onDelete,
  emptyTitle,
  emptyText,
}: LibraryElementsTableProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="text-4xl mb-3">🗂️</div>
        <p className="font-semibold">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyText}</p>
      </div>
    )
  }

  function sourceLabel(exp: Experience): string {
    if (!exp.sourceCvId) return 'Saisie manuelle'
    return cvDocuments.find((cv) => cv.id === exp.sourceCvId)?.file_name ?? 'Saisie manuelle'
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold uppercase text-[var(--color-muted)]">
          <th className="py-2">Élément</th>
          <th className="py-2">Type</th>
          <th className="py-2">Source</th>
          <th className="py-2">Dernière utilisation</th>
          <th className="py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((exp) => (
          <tr key={exp.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <td className="py-3">
              <p className="font-medium">{exp.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{exp.organization}</p>
            </td>
            <td className="py-3 text-[var(--color-muted)]">{typeLabel(exp)}</td>
            <td className="py-3 text-[var(--color-muted)] truncate max-w-[180px]">{sourceLabel(exp)}</td>
            <td className="py-3 text-[var(--color-muted)]">{formatDate(exp.createdAt)}</td>
            <td className="py-3 text-right">
              <button className="btn btn-ghost p-2" onClick={() => onEdit(exp)}><Pencil size={14} /></button>
              <button
                className="btn btn-ghost p-2 text-[var(--color-danger)]"
                onClick={async () => {
                  if (!window.confirm('Supprimer cette entrée ? Cette action est irréversible.')) return
                  await onDelete(exp.id)
                }}
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/LibraryElementsTable.tsx
git commit -m "feat: add LibraryElementsTable for the tabbed Éléments de bibliothèque section"
```

---

### Task 18: Rewrite `LibraryPage.tsx`

**Files:**
- Modify: `src/pages/LibraryPage.tsx` (full rewrite)

**Interfaces:**
- Consumes everything produced by Tasks 2-17: `useCvDocuments`, `useAtsAnalyses`, `useApplications` (existing hook), `computeLibraryStats` from `@/lib/cvLibrary`, `CvCard`, `AtsAnalysisRow`, `NewAtsAnalysisModal`, `AtsAnalysisDetailModal`, `AssociateAnalysisModal`, `CompareCvModal`, `LibrarySuggestionsPanel`, `LibraryElementsTable`.
- Produces: the page component used by the router (signature unchanged: `LibraryPage({ userId, userEmail }: LibraryPageProps)`).

- [ ] **Step 1: Replace the full contents of `src/pages/LibraryPage.tsx`**

```tsx
import { useMemo, useState } from 'react'
import {
  Briefcase, Heart, GraduationCap, Lightbulb, FileUp, Plus, Pencil,
  X, Sparkles, BookMarked, Shapes, FileText, Repeat,
} from 'lucide-react'
import { useExperiences, type NewExperience } from '@/hooks/useExperiences'
import { useProfile } from '@/hooks/useProfile'
import { useCvDocuments } from '@/hooks/useCvDocuments'
import { useAtsAnalyses } from '@/hooks/useAtsAnalyses'
import { useApplications } from '@/hooks/useApplications'
import { computeLibraryStats } from '@/lib/cvLibrary'
import { CVImporter } from '@/components/library/CVImporter'
import { CvCard } from '@/components/library/CvCard'
import { AtsAnalysisRow } from '@/components/library/AtsAnalysisRow'
import { NewAtsAnalysisModal } from '@/components/library/NewAtsAnalysisModal'
import { AtsAnalysisDetailModal } from '@/components/library/AtsAnalysisDetailModal'
import { AssociateAnalysisModal } from '@/components/library/AssociateAnalysisModal'
import { CompareCvModal } from '@/components/library/CompareCvModal'
import { LibrarySuggestionsPanel } from '@/components/library/LibrarySuggestionsPanel'
import { LibraryElementsTable } from '@/components/library/LibraryElementsTable'
import type { AtsAnalysis, Experience, ExperienceType } from '@/lib/types'

const TYPE_CONFIG: Record<ExperienceType, { label: string; icon: React.ReactNode; color: string }> = {
  WORK:      { label: 'Professionnel', icon: <Briefcase size={13} />, color: 'bg-blue-100 text-blue-700' },
  VOLUNTEER: { label: 'Bénévolat', icon: <Heart size={13} />, color: 'bg-pink-100 text-pink-700' },
  EDUCATION: { label: 'Formation', icon: <GraduationCap size={13} />, color: 'bg-purple-100 text-purple-700' },
  PROJECT:   { label: 'Projet', icon: <Lightbulb size={13} />, color: 'bg-yellow-100 text-yellow-700' },
  OTHER:     { label: 'Autre', icon: null, color: 'bg-gray-100 text-gray-600' },
}

type LibraryTab = 'ALL' | 'EXPERIENCES' | 'EDUCATION' | 'SKILLS' | 'INTERESTS'
type ListKind = 'skills' | 'interests'

const LIBRARY_TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'ALL', label: 'Tout' },
  { id: 'EXPERIENCES', label: 'Expériences' },
  { id: 'EDUCATION', label: 'Formations' },
  { id: 'SKILLS', label: 'Compétences' },
  { id: 'INTERESTS', label: "Centres d'intérêt" },
]

interface LibraryPageProps {
  userId: string
  userEmail: string
}

export function LibraryPage({ userId, userEmail }: LibraryPageProps) {
  const { experiences, bulkAddExperiences, addExperience, updateExperience, deleteExperience } = useExperiences(userId)
  const { profile, updateProfile, saving: profileSaving } = useProfile(userId, userEmail)
  const cvDocumentsHook = useCvDocuments(userId)
  const { cvDocuments, uploadCv, updateStatus, getSignedUrl, getCvText, reanalyze, deleteCv, updateAtsScore } = cvDocumentsHook
  const atsAnalysesHook = useAtsAnalyses(userId)
  const { atsAnalyses, createAnalysis, generateRecommendations, associateToApplication } = atsAnalysesHook
  const { applications } = useApplications(userId)

  const [tab, setTab] = useState<LibraryTab>('ALL')
  const [typeFilter, setTypeFilter] = useState<ExperienceType | ''>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importerOpen, setImporterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [listEditor, setListEditor] = useState<ListKind | null>(null)
  const [newAnalysisOpen, setNewAnalysisOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [detailAnalysis, setDetailAnalysis] = useState<{ id: string; mode: 'view' | 'optimize' } | null>(null)
  const [associatingAnalysis, setAssociatingAnalysis] = useState<AtsAnalysis | null>(null)
  const [showAllCv, setShowAllCv] = useState(false)
  const [showAllAnalyses, setShowAllAnalyses] = useState(false)

  const normalizedSearch = search.trim().toLowerCase()

  function matchesDateRange(exp: Experience) {
    if (!dateFrom && !dateTo) return true
    const start = exp.startDate
    const end = exp.current ? null : exp.endDate
    if (dateFrom && end && end < dateFrom) return false
    if (dateFrom && !end && start < dateFrom) return false
    if (dateTo && start > dateTo) return false
    return true
  }

  const allExperiences = useMemo(
    () => experiences.filter((exp) => exp.type !== 'EDUCATION'),
    [experiences],
  )

  const educationExperiences = useMemo(
    () => experiences.filter((exp) => exp.type === 'EDUCATION'),
    [experiences],
  )

  const filteredExperiences = useMemo(
    () => allExperiences
      .filter((exp) => !typeFilter || exp.type === typeFilter)
      .filter(matchesDateRange)
      .filter((exp) => {
        if (!normalizedSearch) return true
        return [
          exp.title,
          exp.organization,
          exp.description ?? '',
          exp.location ?? '',
          ...(exp.skills ?? []),
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allExperiences, normalizedSearch, typeFilter, dateFrom, dateTo],
  )

  const filteredEducation = useMemo(
    () => educationExperiences
      .filter(matchesDateRange)
      .filter((exp) => !normalizedSearch || [
        exp.title,
        exp.organization,
        exp.description ?? '',
        exp.location ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [educationExperiences, normalizedSearch, dateFrom, dateTo],
  )

  const filteredSkills = useMemo(
    () => (profile?.skills ?? []).filter((skill) => !normalizedSearch || skill.toLowerCase().includes(normalizedSearch)),
    [profile?.skills, normalizedSearch],
  )

  const filteredInterests = useMemo(
    () => (profile?.interests ?? []).filter((interest) => !normalizedSearch || interest.toLowerCase().includes(normalizedSearch)),
    [profile?.interests, normalizedSearch],
  )

  const stats = computeLibraryStats(cvDocuments, atsAnalyses)
  const visibleCvDocuments = showAllCv ? cvDocuments : cvDocuments.slice(0, 5)
  const visibleAnalyses = showAllAnalyses ? atsAnalyses : atsAnalyses.slice(0, 5)
  const detailAnalysisData = detailAnalysis ? atsAnalyses.find((a) => a.id === detailAnalysis.id) ?? null : null

  function cvFileNameFor(cvId: string): string {
    return cvDocuments.find((cv) => cv.id === cvId)?.file_name ?? 'CV supprimé'
  }

  async function handleOpenCv(cv: { file_path: string }) {
    const url = await getSignedUrl(cv.file_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleDownloadCv(cv: { file_path: string; file_name: string }) {
    const url = await getSignedUrl(cv.file_path)
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = cv.file_name
    link.click()
  }

  async function handleCreateAnalysis(input: { cvId: string; title: string; jobTitle?: string; jobDescription?: string }): Promise<string | null> {
    const cv = cvDocuments.find((c) => c.id === input.cvId)
    if (!cv) return 'CV introuvable'
    let cvText: string
    try {
      cvText = await getCvText(cv)
    } catch (err) {
      return err instanceof Error ? err.message : "Impossible de lire le contenu du CV"
    }
    const { data, error } = await createAnalysis({
      cvId: input.cvId,
      cvText,
      title: input.title,
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
    })
    if (error) return error
    if (data) await updateAtsScore(input.cvId, data.score)
    return null
  }

  async function handleGenerateRecommendations(analysisId: string): Promise<string | null> {
    const analysis = atsAnalyses.find((a) => a.id === analysisId)
    if (!analysis) return 'Analyse introuvable'
    const cv = cvDocuments.find((c) => c.id === analysis.cv_id)
    if (!cv) return 'CV source introuvable'
    let cvText: string
    try {
      cvText = await getCvText(cv)
    } catch (err) {
      return err instanceof Error ? err.message : "Impossible de lire le contenu du CV"
    }
    return generateRecommendations(analysisId, cvText)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Bibliothèque intelligente</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Importez vos CV, centralisez vos expériences, stockez vos analyses ATS et réutilisez vos meilleurs contenus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary flex items-center gap-2 text-sm" onClick={() => setImporterOpen(true)}>
            <FileUp size={15} />
            Importer un CV
          </button>
          <button className="btn btn-secondary flex items-center gap-2 text-sm" onClick={() => setCompareOpen(true)}>
            <Repeat size={15} />
            Comparer 2 CV
          </button>
          <button className="btn btn-primary flex items-center gap-2 text-sm" onClick={() => setNewAnalysisOpen(true)}>
            <Plus size={15} />
            Nouvelle analyse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="CV importés" value={stats.cvCount} icon={<FileText size={14} />} tone="var(--color-primary)" />
        <StatCard label="Analyses réalisées" value={stats.analysisCount} icon={<Sparkles size={14} />} tone="var(--color-accent)" />
        <StatCard label="Score ATS moyen" value={stats.avgScore !== null ? `${stats.avgScore}%` : '—'} icon={<BookMarked size={14} />} tone="var(--color-success)" />
        <StatCard label="Mots-clés manquants" value={stats.missingKeywordsCount} icon={<Shapes size={14} />} tone="var(--color-warning)" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Mes CV</h2>
            {cvDocuments.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllCv((v) => !v)}>
                {showAllCv ? 'Voir moins' : 'Voir tous'}
              </button>
            )}
          </div>
          {cvDocuments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez votre premier CV pour commencer.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleCvDocuments.map((cv) => (
                <CvCard
                  key={cv.id}
                  cv={cv}
                  onOpen={handleOpenCv}
                  onDownload={handleDownloadCv}
                  onReanalyze={async (c) => { await reanalyze(c) }}
                  onSetStatus={(id, status) => { updateStatus(id, status) }}
                  onDelete={async (id) => {
                    if (window.confirm('Supprimer ce CV ? Le fichier sera définitivement supprimé.')) await deleteCv(id)
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Analyses ATS récentes</h2>
            {atsAnalyses.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllAnalyses((v) => !v)}>
                {showAllAnalyses ? 'Voir moins' : 'Voir toutes'}
              </button>
            )}
          </div>
          {atsAnalyses.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Lancez votre première analyse ATS depuis un CV importé.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleAnalyses.map((analysis) => (
                <AtsAnalysisRow
                  key={analysis.id}
                  analysis={analysis}
                  cvFileName={cvFileNameFor(analysis.cv_id)}
                  onView={(a) => setDetailAnalysis({ id: a.id, mode: 'view' })}
                  onOptimize={(a) => setDetailAnalysis({ id: a.id, mode: 'optimize' })}
                  onAssociate={(a) => setAssociatingAnalysis(a)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <section className="card px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              className="input flex-1"
              placeholder="Rechercher une expérience, une formation, une compétence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input className="input lg:w-40" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input className="input lg:w-40" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {LIBRARY_TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${tab === id ? 'text-white' : 'text-[var(--color-deep-space)]'}`}
                style={{
                  background: tab === id ? 'var(--color-primary)' : '#ffffff',
                  border: tab === id ? 'none' : '1px solid var(--color-border)',
                }}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {(tab === 'ALL' || tab === 'EXPERIENCES') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Expériences</h3>
                <select
                  className="input sm:w-56"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ExperienceType | '')}
                >
                  <option value="">Tous les types hors formation</option>
                  {(Object.keys(TYPE_CONFIG) as ExperienceType[])
                    .filter((type) => type !== 'EDUCATION')
                    .map((type) => <option key={type} value={type}>{TYPE_CONFIG[type].label}</option>)}
                </select>
              </div>
              <LibraryElementsTable
                items={filteredExperiences}
                cvDocuments={cvDocuments}
                typeLabel={(exp) => TYPE_CONFIG[exp.type]?.label ?? TYPE_CONFIG.OTHER.label}
                onEdit={(exp) => { setEditingExperience(exp); setEditorOpen(true) }}
                onDelete={deleteExperience}
                emptyTitle="Aucune expérience trouvée"
                emptyText="Ajoutez vos expériences pour enrichir vos candidatures et vos CV."
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'EDUCATION') && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Formations</h3>
              <LibraryElementsTable
                items={filteredEducation}
                cvDocuments={cvDocuments}
                typeLabel={() => TYPE_CONFIG.EDUCATION.label}
                onEdit={(exp) => { setEditingExperience(exp); setEditorOpen(true) }}
                onDelete={deleteExperience}
                emptyTitle="Aucune formation trouvée"
                emptyText="Ajoutez vos diplômes et formations pour compléter votre profil."
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'SKILLS') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Compétences</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('skills')}>
                  <Pencil size={13} />
                  Gérer
                </button>
              </div>
              <ChipSection
                items={filteredSkills}
                emptyTitle="Aucune compétence"
                emptyText="Ajoutez vos compétences clés pour les réutiliser dans vos CV et candidatures."
                color="var(--color-green-light)"
                textColor="var(--color-green-text)"
                categoryLabel="Compétence"
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'INTERESTS') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Centres d'intérêt</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('interests')}>
                  <Pencil size={13} />
                  Gérer
                </button>
              </div>
              <ChipSection
                items={filteredInterests}
                emptyTitle="Aucun centre d'intérêt"
                emptyText="Ajoutez quelques centres d'intérêt pour humaniser votre profil lorsque c'est pertinent."
                color="var(--color-red-light)"
                textColor="var(--color-red-text)"
                categoryLabel="Centre d'intérêt"
              />
            </div>
          )}
        </section>

        <LibrarySuggestionsPanel experiences={experiences} cvDocuments={cvDocuments} />
      </div>

      {importerOpen && (
        <CVImporter
          userId={userId}
          existingSkills={profile?.skills ?? []}
          existingInterests={profile?.interests ?? []}
          onImportEntries={bulkAddExperiences}
          onImportProfileData={(payload) => updateProfile(payload)}
          onUploadCv={uploadCv}
          onClose={() => setImporterOpen(false)}
        />
      )}

      {editorOpen && (
        <ExperienceEditor
          userId={userId}
          initial={editingExperience}
          onClose={() => { setEditorOpen(false); setEditingExperience(null) }}
          onSave={async (payload, id) => {
            const err = id ? await updateExperience(id, payload) : await addExperience(payload as NewExperience)
            if (!err) { setEditorOpen(false); setEditingExperience(null) }
            return err
          }}
        />
      )}

      {listEditor && (
        <TagListEditor
          title={listEditor === 'skills' ? 'Compétences' : "Centres d'intérêt"}
          items={listEditor === 'skills' ? profile?.skills ?? [] : profile?.interests ?? []}
          saving={profileSaving}
          onClose={() => setListEditor(null)}
          onSave={async (items) => {
            const err = await updateProfile({ [listEditor]: items })
            if (!err) setListEditor(null)
            return err
          }}
        />
      )}

      {newAnalysisOpen && (
        <NewAtsAnalysisModal
          cvDocuments={cvDocuments}
          onSubmit={handleCreateAnalysis}
          onClose={() => setNewAnalysisOpen(false)}
        />
      )}

      {detailAnalysisData && detailAnalysis && (
        <AtsAnalysisDetailModal
          analysis={detailAnalysisData}
          cvFileName={cvFileNameFor(detailAnalysisData.cv_id)}
          mode={detailAnalysis.mode}
          onGenerateRecommendations={handleGenerateRecommendations}
          onClose={() => setDetailAnalysis(null)}
        />
      )}

      {associatingAnalysis && (
        <AssociateAnalysisModal
          analysis={associatingAnalysis}
          applications={applications}
          onAssociate={associateToApplication}
          onClose={() => setAssociatingAnalysis(null)}
        />
      )}

      {compareOpen && (
        <CompareCvModal
          cvDocuments={cvDocuments}
          experiences={experiences}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-[18px] border px-4 py-4 bg-white/75 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="text-[1.7rem] leading-none font-bold text-[var(--color-deep-space)]">{value}</div>
    </div>
  )
}

function ChipSection({
  items,
  emptyTitle,
  emptyText,
  color,
  textColor,
  categoryLabel,
}: {
  items: string[]
  emptyTitle: string
  emptyText: string
  color: string
  textColor: string
  categoryLabel: string
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state py-10">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item} className="rounded-[18px] border bg-white/72 px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textColor }}>{categoryLabel}</p>
          <p className="mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: color, color: textColor }}>{item}</p>
        </div>
      ))}
    </div>
  )
}

interface ExperienceEditorProps {
  userId: string
  initial: Experience | null
  onClose: () => void
  onSave: (payload: Partial<NewExperience>, id?: string) => Promise<string | null>
}

function ExperienceEditor({ userId, initial, onClose, onSave }: ExperienceEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [current, setCurrent] = useState(initial?.current ?? false)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">{initial ? 'Modifier une entrée' : 'Ajouter une entrée'}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const payload: NewExperience = {
              id: initial?.id ?? crypto.randomUUID(),
              userId,
              type: fd.get('type') as ExperienceType,
              title: (fd.get('title') as string).trim(),
              organization: (fd.get('organization') as string).trim(),
              location: (fd.get('location') as string).trim() || null,
              startDate: fd.get('startDate') as string,
              endDate: current ? null : ((fd.get('endDate') as string) || null),
              current,
              description: (fd.get('description') as string).trim() || null,
              skills: (fd.get('skills') as string).split(',').map((s) => s.trim()).filter(Boolean),
              subsection: (fd.get('subsection') as string).trim() || null,
              sourceCvId: initial?.sourceCvId ?? null,
            }
            setSaving(true)
            const err = await onSave(payload, initial?.id)
            setSaving(false)
            setError(err)
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className="input" name="type" defaultValue={initial?.type ?? 'WORK'}>
                {(Object.keys(TYPE_CONFIG) as ExperienceType[]).map((type) => (
                  <option key={type} value={type}>{TYPE_CONFIG[type].label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sous-section">
              <input className="input" name="subsection" defaultValue={initial?.subsection ?? ''} placeholder="Backend, produit, alternance..." />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Titre">
              <input className="input" name="title" defaultValue={initial?.title ?? ''} required />
            </Field>
            <Field label="Organisation">
              <input className="input" name="organization" defaultValue={initial?.organization ?? ''} required />
            </Field>
          </div>

          <Field label="Localisation">
            <input className="input" name="location" defaultValue={initial?.location ?? ''} placeholder="Paris, France" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Début">
              <input className="input" type="date" name="startDate" defaultValue={initial?.startDate ?? ''} required />
            </Field>
            <Field label="Fin">
              <input className="input" type="date" name="endDate" defaultValue={initial?.endDate ?? ''} disabled={current} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
            Entrée en cours
          </label>

          <Field label="Description">
            <textarea className="input resize-y" name="description" rows={4} defaultValue={initial?.description ?? ''} />
          </Field>

          <Field label="Compétences liées">
            <input className="input" name="skills" defaultValue={initial?.skills.join(', ') ?? ''} placeholder="React, TypeScript, Figma..." />
          </Field>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TagListEditor({
  title,
  items,
  saving,
  onClose,
  onSave,
}: {
  title: string
  items: string[]
  saving: boolean
  onClose: () => void
  onSave: (items: string[]) => Promise<string | null>
}) {
  const [value, setValue] = useState(items.join(', '))
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">Gérer : {title}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const parsed = value.split(',').map((item) => item.trim()).filter(Boolean)
            const unique = [...new Set(parsed)]
            const err = await onSave(unique)
            setError(err)
          }}
        >
          <Field label={title}>
            <textarea
              className="input resize-y"
              rows={5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Sépare chaque élément par une virgule"
            />
          </Field>
          <p className="text-xs text-[var(--color-muted)]">
            Exemple : {title === 'Compétences' ? 'TypeScript, React, UX Writing' : 'Escalade, photographie, bénévolat'}
          </p>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero errors, zero warnings.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all existing tests plus the new `src/lib/cvLibrary.test.ts` pass.

- [ ] **Step 4: Manual verification in the browser**

Run: `npm run dev`, navigate to `/library`, and walk the whole flow end-to-end:
1. Click "Importer un CV", upload a real PDF/DOCX résumé, validate the extracted entries → confirm the 4 stat cards update, a new card appears under "Mes CV" with status "À vérifier", and the imported experiences show their file name (not "Saisie manuelle") in the Source column of the Éléments de bibliothèque table.
2. From the CV's `…` menu, click "Marquer comme actif" → badge updates to "Actif". Click "Ouvrir" → file opens in a new tab. Click "Télécharger" → file downloads.
3. Click "Nouvelle analyse", pick the imported CV, optionally paste a job description, submit → confirm a new row appears under "Analyses ATS récentes" with a score, and the CV's own score ring in "Mes CV" updated to match.
4. Click "Optimiser" on that analysis → confirm recommendations generate and display; click "Voir" on it again → confirm recommendations persisted (no second AI call needed, since `generateRecommendations` short-circuits when `recommendations` is already set).
5. Click "Associer", pick an existing application, save → reopen "Voir" and confirm no error.
6. Import a second CV, then click "Comparer 2 CV" → confirm the side-by-side table renders real numbers for both.
7. In the "Suggestions IA" panel, click "Lancer une analyse IA" → confirm 2-3 suggestions render.
8. Delete a CV via its `…` menu → confirm it disappears from "Mes CV" and its previously-linked experiences now show "Saisie manuelle" as Source after a page refresh.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LibraryPage.tsx
git commit -m "feat: rewrite Library page into a CV hub (stats, CV storage, ATS analyses, suggestions)"
```

---

## Self-Review

**Spec coverage:** Header actions (Task 18), 4 stat cards without fake deltas (Task 3 + 18), Mes CV with score/status/actions (Tasks 6, 8, 10, 18), Analyses ATS récentes with Voir/Optimiser/Associer (Tasks 5, 7, 11-14, 18), Éléments de bibliothèque table with Source/Dernière utilisation (Tasks 2, 17, 18), Suggestions IA panel (Tasks 5, 16, 18), Comparer 2 CV (Task 15), CV file storage + bucket (Task 1, 6), sourceCvId tagging on import (Tasks 2, 9) — every spec section maps to at least one task.

**Placeholder scan:** The one deliberate temporary prop in Task 9 Step 4 is explicitly justified and resolved by Task 18 in the same plan, not left dangling — acceptable since both tasks are part of this same plan and execute in order.

**Type consistency:** `CvDocument`/`AtsAnalysis`/`CvStatus` (Task 2) are used with identical field names across Tasks 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18. `uploadCv`, `getCvText`, `reanalyze`, `updateStatus`, `updateAtsScore`, `deleteCv`, `getSignedUrl` (Task 6) and `createAnalysis`, `generateRecommendations`, `associateToApplication` (Task 7) are called with matching signatures in Task 18. `NewExperience.sourceCvId` (Task 2) flows through `CVImporter.tsx` (Task 9) and `ExperienceEditor` (Task 18) consistently.

**Scope check:** Matches the approved spec (screenshot-only scope); backlog items are explicitly out.

