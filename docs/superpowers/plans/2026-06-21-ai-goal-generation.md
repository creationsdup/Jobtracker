# Création d'objectifs assistée par IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user type a free-text description of the job they're looking for and have GPT-4o turn it into a pre-filled `UserGoal` draft, which the user reviews/edits in the existing goal form before saving.

**Architecture:** Reuse the existing `generateStructuredData()` AI plumbing (`src/lib/ai.ts` → Supabase edge function `ai-assistant` → OpenAI). Add one new pure mapping function, one new modal component, and a few additive changes to `GoalsPage.tsx`/`EditGoalModal` to accept a generated draft as the form's initial values.

**Tech Stack:** React 18 + TypeScript, Vitest for unit tests. No new dependencies, no new Supabase migration, no new edge function.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-20-ai-goal-generation-design.md`.
- `contract_types` returned by the AI must be filtered to exactly `['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']` (`CONTRACT_OPTIONS` in `src/pages/GoalsPage.tsx:16`) — defense in depth even though the prompt already constrains this.
- `timeline` returned by the AI must be one of `'1m' | '3m' | '6m' | null` `| '12m'` and is converted to `target_date` via the existing `targetDateFromOption()` (`src/pages/GoalsPage.tsx:29`) — never compute a date directly in the AI layer.
- A field not mentioned in the user's text must come back as `[]`/`null`, never a guessed value.
- Generating a draft never touches the database — only clicking "Enregistrer" in the existing `EditGoalModal` does, via the existing `createGoal()`/`saveGoal()` flow. No new Supabase write path.
- TypeScript strict, no `any` (existing project rule, `CLAUDE.md`).
- No e2e tests (existing project rule, `CLAUDE.md`).

---

### Task 1: `generateGoalFromText()` in `src/lib/ai.ts`

**Files:**
- Modify: `src/lib/ai.ts` (add new exported type + function; no existing code removed)
- Test: none (this file has no existing test coverage for its network-calling functions, consistent with `guessCompanyDomain`/`generateText`; the function is exercised indirectly by Task 2's pure mapping function, which is the only part of this feature with deterministic logic to test)

**Interfaces:**
- Consumes: `generateStructuredData<T>(systemPrompt: string, userContent: string, maxTokens?: number, url?: string): Promise<T>` (already exported in this file, signature unchanged).
- Produces: `interface GeneratedGoal` and `generateGoalFromText(freeText: string): Promise<GeneratedGoal>`, both exported from `src/lib/ai.ts`. Task 3 imports both.

- [ ] **Step 1: Add the `GeneratedGoal` interface and system prompt constant**

Add at the end of `src/lib/ai.ts`:

```typescript
export interface GeneratedGoal {
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
  timeline: '1m' | '3m' | '6m' | '12m' | null
  personal_target: number | null
}

const GOAL_SYSTEM_PROMPT = `Tu es un assistant qui transforme une description libre de recherche d'emploi en objectif structuré pour une plateforme de suivi de candidatures.
Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour, au format exact suivant :
{
  "target_title": "string | null (intitulé cible court, ex: \\"Chef de projet innovation\\")",
  "target_roles": ["string"] (postes recherchés, ex: ["Chef de projet", "PMO"]),
  "contract_types": ["string"] (UNIQUEMENT parmi ces valeurs exactes : "CDI", "CDD", "Stage", "Alternance", "Freelance", "Mission" — omets si non mentionné, n'invente jamais d'autre valeur),
  "locations": ["string"] (villes, régions ou pays acceptés),
  "target_companies": ["string"] (entreprises visées nommément),
  "sectors": ["string"] (secteurs d'activité, ex: ["Transport", "Innovation"]),
  "keywords_wanted": ["string"] (mots-clés métier à privilégier),
  "keywords_excluded": ["string"] (mots-clés à éviter),
  "experience_level": ["string"] (niveau d'expérience recherché, ex: ["junior", "0-2 ans"]),
  "scoring_priorities": "string | null (résumé libre d'une phrase des priorités, informatif uniquement)",
  "timeline": "'1m' | '3m' | '6m' | '12m' | null (urgence de la recherche : 1m = moins d'1 mois, 3m = 1 à 3 mois, 6m = 3 à 6 mois, 12m = plus de 6 mois ; null si aucune urgence n'est mentionnée)",
  "personal_target": "number | null (nombre de candidatures par mois visé, UNIQUEMENT si explicitement mentionné dans le texte, sinon null)"
}
Règle stricte : un champ non mentionné dans le texte doit être un tableau vide [] ou null — n'invente JAMAIS de valeur pour "remplir" un champ.`

export async function generateGoalFromText(freeText: string): Promise<GeneratedGoal> {
  return generateStructuredData<GeneratedGoal>(GOAL_SYSTEM_PROMPT, freeText, 800)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: add generateGoalFromText for AI-assisted goal creation"
```

---

### Task 2: `mapGeneratedGoalToDraft()` pure mapping function

**Files:**
- Create: `src/lib/goalDraft.ts`
- Test: `src/lib/goalDraft.test.ts`

**Interfaces:**
- Consumes: `GeneratedGoal` (Task 1, `src/lib/ai.ts`), `GoalUpdate` (already exported from `src/hooks/useGoals.ts`).
- Produces: `mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate`, imported by Task 3 (`AIGoalGeneratorModal.tsx`) and Task 4 (`GoalsPage.tsx`, indirectly via Task 3).

This task needs `CONTRACT_OPTIONS` and `targetDateFromOption`, both currently defined as module-private in `src/pages/GoalsPage.tsx` (lines 16 and 29). Move them into `src/lib/goalDraft.ts` and export them, then re-export/import from `GoalsPage.tsx` so there is a single source of truth (this is a small, safe refactor — both are pure, side-effect-free, and `GoalsPage.tsx` is the only current consumer).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/goalDraft.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapGeneratedGoalToDraft, CONTRACT_OPTIONS, targetDateFromOption } from './goalDraft'
import type { GeneratedGoal } from './ai'

function baseGenerated(overrides: Partial<GeneratedGoal> = {}): GeneratedGoal {
  return {
    target_title: null,
    target_roles: [],
    contract_types: [],
    locations: [],
    target_companies: [],
    sectors: [],
    keywords_wanted: [],
    keywords_excluded: [],
    experience_level: [],
    scoring_priorities: null,
    timeline: null,
    personal_target: null,
    ...overrides,
  }
}

describe('mapGeneratedGoalToDraft', () => {
  it('converts each timeline bucket to the matching target_date', () => {
    for (const bucket of ['1m', '3m', '6m', '12m'] as const) {
      const draft = mapGeneratedGoalToDraft(baseGenerated({ timeline: bucket }))
      expect(draft.target_date).toBe(targetDateFromOption(bucket))
    }
  })

  it('leaves target_date null when timeline is null', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ timeline: null }))
    expect(draft.target_date).toBeNull()
  })

  it('filters out contract_types not in CONTRACT_OPTIONS', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ contract_types: ['CDI', 'Vacation', 'Freelance'] }))
    expect(draft.contract_types).toEqual(['CDI', 'Freelance'])
  })

  it('keeps all valid contract_types', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ contract_types: [...CONTRACT_OPTIONS] }))
    expect(draft.contract_types).toEqual(CONTRACT_OPTIONS)
  })

  it('passes through empty/null fields without inventing defaults', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated())
    expect(draft.target_title).toBeNull()
    expect(draft.target_roles).toEqual([])
    expect(draft.locations).toEqual([])
    expect(draft.target_companies).toEqual([])
    expect(draft.sectors).toEqual([])
    expect(draft.keywords_wanted).toEqual([])
    expect(draft.keywords_excluded).toEqual([])
    expect(draft.experience_level).toEqual([])
    expect(draft.scoring_priorities).toBeNull()
    expect(draft.personal_target).toBeNull()
  })

  it('passes through populated array/string/number fields unchanged', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({
      target_title: 'Chef de projet innovation',
      target_roles: ['Chef de projet', 'PMO'],
      locations: ['Paris'],
      target_companies: ['SNCF'],
      sectors: ['Transport'],
      keywords_wanted: ['pilotage'],
      keywords_excluded: ['manutention'],
      experience_level: ['junior'],
      scoring_priorities: 'Je privilégie le secteur transport.',
      personal_target: 8,
    }))
    expect(draft.target_title).toBe('Chef de projet innovation')
    expect(draft.target_roles).toEqual(['Chef de projet', 'PMO'])
    expect(draft.locations).toEqual(['Paris'])
    expect(draft.target_companies).toEqual(['SNCF'])
    expect(draft.sectors).toEqual(['Transport'])
    expect(draft.keywords_wanted).toEqual(['pilotage'])
    expect(draft.keywords_excluded).toEqual(['manutention'])
    expect(draft.experience_level).toEqual(['junior'])
    expect(draft.scoring_priorities).toBe('Je privilégie le secteur transport.')
    expect(draft.personal_target).toBe(8)
  })
})

describe('targetDateFromOption', () => {
  it('adds the right number of months for each bucket', () => {
    const now = new Date()
    const expectedMonths: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }
    for (const [bucket, months] of Object.entries(expectedMonths)) {
      const expected = new Date(now)
      expected.setMonth(expected.getMonth() + months)
      expect(targetDateFromOption(bucket)).toBe(expected.toISOString().slice(0, 10))
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/goalDraft.test.ts`
Expected: FAIL — `Cannot find module './goalDraft'` (file doesn't exist yet).

- [ ] **Step 3: Create `src/lib/goalDraft.ts`**

```typescript
import type { GeneratedGoal } from './ai'
import type { GoalUpdate } from '@/hooks/useGoals'

export const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']

export function targetDateFromOption(opt: string): string {
  const now = new Date()
  const months = ({ '1m': 1, '3m': 3, '6m': 6, '12m': 12 } as Record<string, number>)[opt] ?? 3
  now.setMonth(now.getMonth() + months)
  return now.toISOString().slice(0, 10)
}

export function optionFromTargetDate(date: string | null): string {
  if (!date) return ''
  const diff = Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (diff <= 1) return '1m'
  if (diff <= 3) return '3m'
  if (diff <= 6) return '6m'
  return '12m'
}

export function mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate {
  return {
    target_title: generated.target_title,
    target_roles: generated.target_roles,
    contract_types: generated.contract_types.filter((c) => CONTRACT_OPTIONS.includes(c)),
    locations: generated.locations,
    target_companies: generated.target_companies,
    sectors: generated.sectors,
    keywords_wanted: generated.keywords_wanted,
    keywords_excluded: generated.keywords_excluded,
    experience_level: generated.experience_level,
    scoring_priorities: generated.scoring_priorities,
    target_date: generated.timeline ? targetDateFromOption(generated.timeline) : null,
    personal_target: generated.personal_target,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/goalDraft.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Remove the now-duplicated definitions from `GoalsPage.tsx` and import from `goalDraft.ts`**

In `src/pages/GoalsPage.tsx`:
- Delete the local `const CONTRACT_OPTIONS = [...]` (line 16) and the local `function targetDateFromOption(...)` / `function optionFromTargetDate(...)` (lines 29-43).
- Add to the top imports:

```typescript
import { CONTRACT_OPTIONS, targetDateFromOption, optionFromTargetDate } from '@/lib/goalDraft'
```

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: no type errors; all tests (including pre-existing `jobMatching.test.ts`) still pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/goalDraft.ts src/lib/goalDraft.test.ts src/pages/GoalsPage.tsx
git commit -m "feat: add mapGeneratedGoalToDraft, dedupe CONTRACT_OPTIONS/targetDateFromOption"
```

---

### Task 3: `AIGoalGeneratorModal` component

**Files:**
- Create: `src/components/applications/AIGoalGeneratorModal.tsx`

**Interfaces:**
- Consumes: `generateGoalFromText(freeText: string): Promise<GeneratedGoal>` (Task 1), `mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate` (Task 2), `GoalUpdate` (`src/hooks/useGoals.ts`).
- Produces: `AIGoalGeneratorModal` React component with props `{ onGenerated: (draft: GoalUpdate) => void; onClose: () => void }`, imported by Task 4 (`GoalsPage.tsx`).

- [ ] **Step 1: Create the component**

```typescript
// src/components/applications/AIGoalGeneratorModal.tsx
import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { generateGoalFromText } from '@/lib/ai'
import { mapGeneratedGoalToDraft } from '@/lib/goalDraft'
import type { GoalUpdate } from '@/hooks/useGoals'

interface AIGoalGeneratorModalProps {
  onGenerated: (draft: GoalUpdate) => void
  onClose: () => void
}

export function AIGoalGeneratorModal({ onGenerated, onClose }: AIGoalGeneratorModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleGenerate() {
    if (!text.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      const generated = await generateGoalFromText(text)
      onGenerated(mapGeneratedGoalToDraft(generated))
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Impossible de générer l'objectif. Réessayez.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles size={16} /> Créer un objectif avec l'IA
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-lg leading-none">×</button>
        </div>

        {!loading && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Décris ce que tu recherches : poste, secteur, contrat, zone, entreprises visées,
              mots-clés à privilégier ou éviter, urgence, rythme de candidature…
            </p>
            <textarea
              className="input w-full text-sm resize-y"
              rows={5}
              placeholder="Ex : Je cherche un poste de chef de projet PMO dans le secteur transport, en CDI, sur Paris ou en Île-de-France, idéalement chez Keolis ou la SNCF. J'évite les postes de manutention. Je veux trouver vite, dans le mois."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            {errorMsg && (
              <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
                <AlertCircle size={12} /> {errorMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={!text.trim()}>
                Générer
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted)]">Génération de l'objectif en cours…</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/applications/AIGoalGeneratorModal.tsx
git commit -m "feat: add AIGoalGeneratorModal for free-text goal generation"
```

---

### Task 4: Wire the modal into `GoalsPage.tsx`

**Files:**
- Modify: `src/pages/GoalsPage.tsx`

**Interfaces:**
- Consumes: `AIGoalGeneratorModal` (Task 3), `EditGoalModalProps` (existing, this task extends it).

- [ ] **Step 1: Extend `EditGoalModal` to accept an optional generated draft**

In `src/pages/GoalsPage.tsx`, find `interface EditGoalModalProps` (around line 508) and add a field:

```typescript
interface EditGoalModalProps {
  goal: UserGoal | null
  initialDraft: GoalUpdate | null
  isActive: boolean
  saving: boolean
  onSave: (u: GoalUpdate) => void
  onActivate: () => void
  onDelete: () => void
  onClose: () => void
}
```

In the `EditGoalModal` function body (around line 518), change the destructured props and the `useState` seed values to fall back to `initialDraft` when there's no existing `goal`:

```typescript
function EditGoalModal({ goal, initialDraft, isActive, saving, onSave, onActivate, onDelete, onClose }: EditGoalModalProps) {
  const seed = goal ?? initialDraft
  const [targetTitle, setTargetTitle] = useState(seed?.target_title ?? '')
  const [roles, setRoles] = useState<string[]>(seed?.target_roles ?? [])
  const [contracts, setContracts] = useState<string[]>(seed?.contract_types ?? [])
  const [locations, setLocations] = useState<string[]>(seed?.locations ?? [])
  const [companies, setCompanies] = useState<string[]>(seed?.target_companies ?? [])
  const [sectors, setSectors] = useState<string[]>(seed?.sectors ?? [])
  const [keywordsWanted, setKeywordsWanted] = useState<string[]>(seed?.keywords_wanted ?? [])
  const [keywordsExcluded, setKeywordsExcluded] = useState<string[]>(seed?.keywords_excluded ?? [])
  const [experienceLevel, setExperienceLevel] = useState<string[]>(seed?.experience_level ?? [])
  const [priorities, setPriorities] = useState(seed?.scoring_priorities ?? '')
  const [timeline, setTimeline] = useState(optionFromTargetDate(seed?.target_date ?? null))
  const [target, setTarget] = useState(seed?.personal_target ?? 10)
```

(`GoalUpdate` and `UserGoal` share the same field names — see `src/hooks/useGoals.ts:5-18` vs `src/lib/types.ts:67-85` — so `seed` typed as `UserGoal | GoalUpdate | null` resolves every field access above without a cast.)

- [ ] **Step 2: Add state for the AI modal and the generated draft in `GoalsPage`**

In the `GoalsPage` function body (around line 756-762), add two new state variables next to the existing ones:

```typescript
const [showAIGenerator, setShowAIGenerator] = useState(false)
const [generatedDraft, setGeneratedDraft] = useState<GoalUpdate | null>(null)
```

- [ ] **Step 3: Add the handler that receives the AI draft and opens the edit form**

Add this function next to `handleSave`/`handleActivate`/`handleDelete` (around line 787):

```typescript
function handleAIGenerated(draft: GoalUpdate) {
  setShowAIGenerator(false)
  setGeneratedDraft(draft)
  setCreatingNew(true)
  setSelectedGoalId(null)
  setEditing(true)
}
```

- [ ] **Step 4: Add the "Créer avec l'IA" button to the page header**

Replace the header block (around lines 820-823):

```typescript
<div className="mb-5 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Objectifs</h1>
    <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Définissez votre stratégie et suivez la cohérence de vos candidatures</p>
  </div>
  <button onClick={() => setShowAIGenerator(true)} className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0">
    <Sparkles size={14} />
    Créer avec l'IA
  </button>
</div>
```

Add `Sparkles` to the `lucide-react` import at the top of the file (line 2-6):

```typescript
import {
  Target, MapPin, Briefcase, Clock, Building2, Pencil, X, Plus,
  CheckCircle2, AlertCircle, Lightbulb, Layers, ThumbsUp, ThumbsDown, GraduationCap,
  Star, Trash2, BarChart3, Sparkles,
} from 'lucide-react'
```

Add the import for the new modal near the top, with the other local imports:

```typescript
import { AIGoalGeneratorModal } from '@/components/applications/AIGoalGeneratorModal'
```

- [ ] **Step 5: Pass `initialDraft` to `EditGoalModal` and render `AIGoalGeneratorModal` when open**

Update the `EditGoalModal` usage (around line 870-880):

```typescript
{editing && (
  <EditGoalModal
    goal={viewedGoal}
    initialDraft={viewedGoal ? null : generatedDraft}
    isActive={!!viewedGoal && viewedGoal.id === activeGoal?.id}
    saving={saving}
    onSave={handleSave}
    onActivate={handleActivate}
    onDelete={handleDelete}
    onClose={() => { setEditing(false); setCreatingNew(false); setGeneratedDraft(null) }}
  />
)}

{showAIGenerator && (
  <AIGoalGeneratorModal
    onGenerated={handleAIGenerated}
    onClose={() => setShowAIGenerator(false)}
  />
)}
```

- [ ] **Step 6: Also clear `generatedDraft` when the user cancels goal creation from the "Annuler" path inside the existing `onCreateNew` flow**

The existing `onCreateNew` handler on `GoalTabs` (around line 848) opens a blank create form. Since that path doesn't go through `handleAIGenerated`, it must not see a stale draft from a previous AI generation. Update it:

```typescript
onCreateNew={() => { setViewMode('goal'); setCreatingNew(true); setGeneratedDraft(null); setEditing(true) }}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (no test touches this UI wiring directly — covered by Task 2's unit tests plus manual verification in Task 5).

- [ ] **Step 9: Commit**

```bash
git add src/pages/GoalsPage.tsx
git commit -m "feat: wire AIGoalGeneratorModal into GoalsPage, seed EditGoalModal from AI draft"
```

---

### Task 5: Manual verification in the browser

**Files:** none (manual QA step, per `CLAUDE.md`: "Tester chaque fonctionnalité dans le navigateur avant de valider").

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Generate a goal from free text**

In the browser, navigate to the Objectifs page, click "Créer avec l'IA", type a description such as:
> "Je cherche un poste de chef de projet PMO dans le secteur transport, en CDI, sur Paris ou en Île-de-France, idéalement chez Keolis ou la SNCF. J'évite les postes de manutention. Je veux trouver vite, dans le mois."

Click "Générer". Confirm:
- The AI modal closes and `EditGoalModal` opens.
- `target_roles` contains something like "Chef de projet"/"PMO", `contract_types` contains "CDI", `locations` contains "Paris"/"Île-de-France", `target_companies` contains "Keolis"/"SNCF", `keywords_excluded` contains something like "manutention", the "Urgent" timeline button is pre-selected.
- All fields remain editable.

- [ ] **Step 3: Save and confirm persistence**

Click "Enregistrer". Confirm the new goal appears in the goal tabs and its data matches what was reviewed. Reload the page and confirm the goal persisted.

- [ ] **Step 4: Verify the error path**

Temporarily break the edge function call (e.g. rename `VITE_SUPABASE_URL` in `.env.local` to an invalid value, restart the dev server) — or, if the edge function happens to already be unreachable, skip the breakage step. Click "Créer avec l'IA", type any text, click "Générer". Confirm an inline error message appears in the modal and the typed text is preserved (not cleared). Revert any temporary env change and restart the dev server afterward.

- [ ] **Step 5: Verify cancelling never touches existing data**

Open "Créer avec l'IA", generate a draft, then click "Annuler" in the resulting `EditGoalModal` instead of "Enregistrer". Confirm no new goal was created (goal tabs unchanged, reload confirms nothing persisted).

---

## Self-Review Notes

- **Spec coverage:** every section of `2026-06-20-ai-goal-generation-design.md` maps to a task — architecture (Task 1+2+3), data contract (Task 1+2), UX flow (Task 3+4), limits/no-merge behavior (Task 4 always creates a new goal via the existing `createGoal()` path, never overwrites an existing one — consistent with the spec's "replace entirely" decision, now expressed naturally through the multi-goal model that shipped after the spec was written), tests (Task 2).
- **Deviation from the spec worth calling out explicitly:** the spec was written against a single-goal model and a `saveGoal(updates)` "replace entirely" call. The codebase has since gained multi-goal support (`createGoal`/`saveGoal(goalId, updates)`/`activeGoal`). This plan adapts the spec's intent — "AI proposes a full draft, never silently merged into something existing" — onto the current multi-goal reality: generating from AI always opens the *create new goal* path (`creatingNew = true`, `viewedGoal` is `null`), so there is never an existing goal to merge into in the first place. No behavior from the spec is lost.
- **Type consistency check:** `GoalUpdate` (Task 1 produces values shaped for it, Task 2 returns it, Task 3's `onGenerated` prop takes it, Task 4 stores it in `generatedDraft: GoalUpdate | null` and feeds it to `EditGoalModal`'s new `initialDraft: GoalUpdate | null` prop) is used with identical field names end to end.
