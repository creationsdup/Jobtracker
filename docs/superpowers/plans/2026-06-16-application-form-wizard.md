# Application Form Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the centered modal in `ApplicationForm.tsx` with a full-height right-side drawer containing a 3-step wizard (L'offre → Suivi → Notes), per `docs/superpowers/specs/2026-06-16-application-form-wizard-design.md`.

**Architecture:** `ApplicationForm.tsx` becomes a stateful container (current step, controlled form data object, validation) that renders a drawer shell + progress bar + the active step component. Each step is a small, focused presentational component receiving `value`/`onChange` props. No backend, schema, or `useApplications` changes — `onSave` is called with the exact same payload shape as today.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react icons. No test framework is configured in this project (no Vitest/RTL setup yet) — verification in this plan is via `tsc --noEmit`, `vite build`, and manual browser checks against the dev server, consistent with the rest of the codebase.

---

## File Structure

- **Create** `src/components/applications/steps/ApplicationFormStepOffer.tsx` — fields: Entreprise, Poste, Lieu, Contrat, URL de l'offre + "Import IA" button (create mode only)
- **Create** `src/components/applications/steps/ApplicationFormStepTracking.tsx` — fields: Statut, Date de candidature
- **Create** `src/components/applications/steps/ApplicationFormStepNotes.tsx` — field: Notes
- **Modify** `src/components/applications/ApplicationForm.tsx` — full rewrite: drawer shell, step state, validation, submit, wiring of the 3 step components and the existing `JobOfferImporter`
- No other file changes. `App.tsx` already renders `<ApplicationForm ... />` with `initial`, `userId`, `onSave`, `externalError`, `onClose` — this public interface does not change, so `App.tsx` needs no edits.

---

### Task 1: Shared form data type and step components

**Files:**
- Create: `src/components/applications/steps/ApplicationFormStepOffer.tsx`
- Create: `src/components/applications/steps/ApplicationFormStepTracking.tsx`
- Create: `src/components/applications/steps/ApplicationFormStepNotes.tsx`

- [ ] **Step 1: Create the Offer step component**

```tsx
// src/components/applications/steps/ApplicationFormStepOffer.tsx
import { Sparkles } from 'lucide-react'

export interface ApplicationFormData {
  company: string
  position: string
  location: string
  contractType: string
  jobUrl: string
  status: string
  appliedAt: string
  notes: string
}

interface ApplicationFormStepOfferProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
  showImport: boolean
  onImportClick: () => void
}

export function ApplicationFormStepOffer({ value, onChange, showImport, onImportClick }: ApplicationFormStepOfferProps) {
  return (
    <div className="flex flex-col gap-6">
      {showImport && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={onImportClick}>
          <Sparkles size={13} />
          Import IA
        </button>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Entreprise *</label>
          <input
            className="input text-base py-2.5"
            value={value.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Google"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Poste *</label>
          <input
            className="input text-base py-2.5"
            value={value.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="Développeur Frontend"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Lieu</label>
          <input
            className="input text-base py-2.5"
            value={value.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Paris, France"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Contrat</label>
          <input
            className="input text-base py-2.5"
            value={value.contractType}
            onChange={(e) => onChange({ contractType: e.target.value })}
            placeholder="CDI, CDD, Stage..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">URL de l'offre</label>
        <input
          className="input text-base py-2.5"
          type="url"
          value={value.jobUrl}
          onChange={(e) => onChange({ jobUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the Tracking step component**

```tsx
// src/components/applications/steps/ApplicationFormStepTracking.tsx
import type { ApplicationFormData } from './ApplicationFormStepOffer'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'WISHLIST', label: 'À postuler' },
  { value: 'APPLIED', label: 'Postulée' },
  { value: 'PHONE_SCREEN', label: 'Pré-sélection' },
  { value: 'INTERVIEW', label: 'Entretien' },
  { value: 'TECHNICAL_TEST', label: 'Test technique' },
  { value: 'OFFER', label: 'Offre reçue' },
  { value: 'ACCEPTED', label: 'Acceptée' },
  { value: 'REJECTED', label: 'Refusée' },
  { value: 'WITHDRAWN', label: 'Abandonnée' },
]

interface ApplicationFormStepTrackingProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
}

export function ApplicationFormStepTracking({ value, onChange }: ApplicationFormStepTrackingProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Statut</label>
        <select
          className="input text-base py-2.5"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Date de candidature</label>
        <input
          className="input text-base py-2.5"
          type="date"
          value={value.appliedAt}
          onChange={(e) => onChange({ appliedAt: e.target.value })}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the Notes step component**

```tsx
// src/components/applications/steps/ApplicationFormStepNotes.tsx
import type { ApplicationFormData } from './ApplicationFormStepOffer'

interface ApplicationFormStepNotesProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
}

export function ApplicationFormStepNotes({ value, onChange }: ApplicationFormStepNotesProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Notes</label>
      <textarea
        className="input resize-y text-base py-2.5"
        rows={8}
        value={value.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Notes sur la candidature..."
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify the three new files compile**

Run: `npx tsc --noEmit`
Expected: no errors (the step files have no consumers yet, but they must be self-contained and type-correct)

- [ ] **Step 5: Commit**

```bash
git add src/components/applications/steps/ApplicationFormStepOffer.tsx src/components/applications/steps/ApplicationFormStepTracking.tsx src/components/applications/steps/ApplicationFormStepNotes.tsx
git commit -m "feat: add step components for application form wizard"
```

---

### Task 2: Rewrite ApplicationForm.tsx as a drawer wizard

**Files:**
- Modify: `src/components/applications/ApplicationForm.tsx` (full rewrite, replacing all 151 existing lines)

- [ ] **Step 1: Replace the entire file content**

```tsx
// src/components/applications/ApplicationForm.tsx
import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Application, ApplicationStatus } from '@/lib/types'
import { JobOfferImporter } from './JobOfferImporter'
import { ApplicationFormStepOffer, type ApplicationFormData } from './steps/ApplicationFormStepOffer'
import { ApplicationFormStepTracking } from './steps/ApplicationFormStepTracking'
import { ApplicationFormStepNotes } from './steps/ApplicationFormStepNotes'

const STEPS = [
  { id: 1, label: "L'offre" },
  { id: 2, label: 'Suivi' },
  { id: 3, label: 'Notes' },
] as const

interface ApplicationFormProps {
  initial?: Application | null
  userId: string
  onSave: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  externalError?: string | null
  onClose: () => void
}

function buildFormData(
  initial: Application | null | undefined,
  imported: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>> | null,
): ApplicationFormData {
  const source = imported ?? initial
  return {
    company: source?.company ?? '',
    position: source?.position ?? '',
    location: source?.location ?? '',
    contractType: source?.contractType ?? '',
    jobUrl: source?.jobUrl ?? '',
    status: source?.status ?? 'WISHLIST',
    appliedAt: source?.appliedAt ?? '',
    notes: source?.notes ?? '',
  }
}

export function ApplicationForm({ initial, userId, onSave, externalError, onClose }: ApplicationFormProps) {
  const [saving, setSaving] = useState(false)
  const [importerOpen, setImporterOpen] = useState(false)
  const [importedData, setImportedData] = useState<Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>> | null>(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<ApplicationFormData>(() => buildFormData(initial, importedData))

  const isEditMode = !!initial
  const maxReachedStep = isEditMode ? 3 : step

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function patchFormData(patch: Partial<ApplicationFormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function handleImport(data: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>) {
    setImportedData(data)
    setFormData(buildFormData(initial, data))
    setImporterOpen(false)
  }

  const step1Valid = formData.company.trim().length > 0 && formData.position.trim().length > 0

  function goNext() {
    if (step === 1 && !step1Valid) return
    setStep((s) => Math.min(3, s + 1))
  }

  function goPrev() {
    setStep((s) => Math.max(1, s - 1))
  }

  function goToStep(target: number) {
    if (isEditMode || target <= maxReachedStep) setStep(target)
  }

  async function handleSubmit() {
    if (!step1Valid) { setStep(1); return }
    setSaving(true)
    await onSave({
      userId,
      company: formData.company.trim(),
      position: formData.position.trim(),
      location: formData.location.trim() || null,
      contractType: formData.contractType.trim() || null,
      jobUrl: formData.jobUrl.trim() || null,
      status: formData.status as ApplicationStatus,
      notes: formData.notes.trim() || null,
      appliedAt: formData.appliedAt || null,
      resumeId: initial?.resumeId ?? null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-[var(--color-surface)] shadow-[var(--shadow-lg)] flex flex-col h-full">
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[var(--color-border)]">
          <h3 className="text-xl font-bold">{initial ? 'Modifier la candidature' : 'Nouvelle candidature'}</h3>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="px-8 pt-5 pb-2 flex items-center gap-3">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={() => goToStep(s.id)}
                disabled={!isEditMode && s.id > maxReachedStep}
                className="flex items-center gap-2 text-sm font-medium disabled:cursor-not-allowed"
                style={{ color: step === s.id ? 'var(--color-primary)' : 'var(--color-muted)' }}
              >
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  style={{
                    background: step >= s.id ? 'var(--color-primary)' : 'var(--color-border)',
                    color: step >= s.id ? '#fff' : 'var(--color-muted)',
                  }}
                >
                  {s.id}
                </span>
                {s.label}
              </button>
              {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-[var(--color-border)]" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 1 && (
            <ApplicationFormStepOffer
              value={formData}
              onChange={patchFormData}
              showImport={!initial}
              onImportClick={() => setImporterOpen(true)}
            />
          )}
          {step === 2 && (
            <ApplicationFormStepTracking value={formData} onChange={patchFormData} />
          )}
          {step === 3 && (
            <ApplicationFormStepNotes value={formData} onChange={patchFormData} />
          )}

          {externalError && (
            <p className="text-sm text-[var(--color-danger)] mt-4">{externalError}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-[var(--color-border)]">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={goPrev} disabled={saving}>
                <ChevronLeft size={16} />
                Précédent
              </button>
            )}
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={goNext} disabled={saving || (step === 1 && !step1Valid)}>
                Suivant
                <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>

      {importerOpen && (
        <JobOfferImporter
          onImport={handleImport}
          onClose={() => setImporterOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors. If `ApplicationFormData['status']` typing causes a mismatch where `formData.status as ApplicationStatus` is used, this is intentional (the wizard keeps status as a plain string internally and casts only at submit time) — no fix needed unless `tsc` actually reports an error.

- [ ] **Step 3: Production build**

Run: `npx vite build`
Expected: build succeeds with no errors (warnings about chunk size are pre-existing and fine)

- [ ] **Step 4: Commit**

```bash
git add src/components/applications/ApplicationForm.tsx
git commit -m "feat: replace application form modal with a 3-step drawer wizard"
```

---

### Task 3: Manual verification in the browser

**Files:** none (manual QA only — no test framework is configured in this project)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:5173`

- [ ] **Step 2: Verify creation flow**

In the browser: open the app, click "Nouvelle candidature" (or the equivalent add button on the Kanban/Applications page).
Expected:
- A drawer slides in from the right, full height, overlay dims the background
- Step 1 "L'offre" is shown with Entreprise/Poste/Lieu/Contrat/URL fields and an "Import IA" button
- Clicking "Suivant" with empty Entreprise/Poste does nothing (button stays disabled)
- Filling Entreprise + Poste enables "Suivant"; clicking it shows Step 2 "Suivi" (Statut/Date)
- Clicking step indicators 2 or 3 directly does nothing yet (sequential-only in create mode) — only "Suivant"/"Précédent" move between steps
- Reaching Step 3 "Notes" and clicking "Enregistrer" creates the application and closes the drawer (verify the new card appears in the list/board)

- [ ] **Step 3: Verify edit flow**

In the browser: click an existing application card to edit it.
Expected:
- Drawer opens directly on Step 1, pre-filled with the existing data
- Clicking step indicators 2 and 3 directly jumps to those steps (edit mode allows free navigation)
- No "Import IA" button is shown (edit mode hides it)
- Editing a field and clicking through to "Enregistrer" persists the change (verify in the list/board)

- [ ] **Step 4: Verify Escape and overlay-click close behavior**

In the browser: open the drawer, press `Escape` — it closes. Reopen it, click on the dimmed overlay outside the drawer — it closes. Reopen it, click inside the drawer — it stays open.

- [ ] **Step 5: Report results**

If any expected behavior above doesn't match, note exactly which step failed and what happened instead before moving on — do not mark this task done with unresolved mismatches.

---

## Summary of changes

| File | Change |
|---|---|
| `src/components/applications/steps/ApplicationFormStepOffer.tsx` | New — Step 1 fields |
| `src/components/applications/steps/ApplicationFormStepTracking.tsx` | New — Step 2 fields |
| `src/components/applications/steps/ApplicationFormStepNotes.tsx` | New — Step 3 field |
| `src/components/applications/ApplicationForm.tsx` | Rewritten — drawer shell + wizard state/validation/submit |

No changes to `App.tsx`, `useApplications.ts`, database schema, or any other caller — `ApplicationForm`'s public props are unchanged.
