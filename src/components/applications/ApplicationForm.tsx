import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SlidersHorizontal, StickyNote, X } from 'lucide-react'
import type { Application } from '@/lib/types'
import { guessCompanyWebsiteFromJobUrl } from '@/lib/jobBoards'
import { FEATURES } from '@/config/edition'
import {
  canSaveDraft,
  createDraft,
  initialSections,
  localDateString,
  patchDraft,
  toPayload,
  withStatus,
  type ApplicationDraft,
  type ApplicationPayload,
} from '@/lib/applicationDraft'
import { CollapsibleSection } from './form/CollapsibleSection'
import { DetailsFields } from './form/DetailsFields'
import { OfferEssentials } from './form/OfferEssentials'
import { StatusPicker } from './form/StatusPicker'

// WHY: condition littérale (pas FEATURES.ai) pour que Rollup supprime l'import d'offre — et lib/ai —
// du build lite. Voir spec §3.3.
const JobOfferImporter = __APP_EDITION__ === 'full'
  ? lazy(() => import('./JobOfferImporter').then((m) => ({ default: m.JobOfferImporter })))
  : null

interface ApplicationFormProps {
  initial?: Application | null
  userId: string
  onSave: (data: ApplicationPayload) => Promise<void>
  onSaveCompanyWebsite: (company: string, website: string) => Promise<string | null>
  existingCompanyWebsite?: string | null
  lookupCompanyDomain: (company: string) => string | undefined
  externalError?: string | null
  onClose: () => void
}

export function ApplicationForm({ initial, userId, onSave, onSaveCompanyWebsite, existingCompanyWebsite, lookupCompanyDomain, externalError, onClose }: ApplicationFormProps) {
  const isEditMode = !!initial
  const [draft, setDraft] = useState<ApplicationDraft>(() => createDraft(initial, existingCompanyWebsite))
  const [sections, setSections] = useState(() => initialSections(createDraft(initial, existingCompanyWebsite)))
  const [saving, setSaving] = useState(false)
  const [importerOpen, setImporterOpen] = useState(false)
  const [logoLookupLoading, setLogoLookupLoading] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const canSave = canSaveDraft(draft)

  useEffect(() => {
    if (!isEditMode) linkInputRef.current?.focus()
  }, [isEditMode])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function patch(changes: Partial<ApplicationDraft>) {
    setDraft((prev) => patchDraft(prev, changes, lookupCompanyDomain))
  }

  // Si la saisie ne correspond à aucune entrée connue de la banque de logos, demande à l'IA
  // de reconnaître l'entreprise (sigle, marque) et trouver son domaine, puis l'enregistre dans
  // le catalogue partagé pour que les prochaines saisies (par n'importe quel utilisateur) soient
  // instantanées. Désactivé en édition lite (pas d'IA).
  async function handleCompanyBlur() {
    const company = draft.company.trim()
    if (!company || draft.companyWebsite.trim() || lookupCompanyDomain(company)) return
    // WHY: condition littérale pour que Rollup supprime l'import de lib/ai du build lite (spec §3.3).
    if (__APP_EDITION__ !== 'full') return
    setLogoLookupLoading(true)
    let domain: string | null = null
    try {
      // WHY: si l'import dynamique ou l'appel IA échoue (déploiement obsolète, hors-ligne), on se
      // comporte comme si aucun domaine n'avait été trouvé plutôt que de laisser planter le flux
      // ou bloquer logoLookupLoading à true indéfiniment.
      const { guessCompanyDomain } = await import('@/lib/ai')
      domain = await guessCompanyDomain(company)
    } catch {
      return
    } finally {
      setLogoLookupLoading(false)
    }
    if (!domain) return
    setDraft((prev) => (prev.companyWebsite.trim() || prev.company.trim() !== company ? prev : { ...prev, companyWebsite: domain }))
    await onSaveCompanyWebsite(company, domain)
  }

  function handleImport(data: Partial<ApplicationPayload> & { companyWebsite?: string | null }) {
    const guessedWebsite = data.jobUrl ? guessCompanyWebsiteFromJobUrl(data.jobUrl) : null
    const next = createDraft(data, data.companyWebsite || guessedWebsite || existingCompanyWebsite)
    setDraft(next)
    setSections(initialSections(next))
    setImporterOpen(false)
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    try {
      const website = draft.companyWebsite.trim()
      if (website) await onSaveCompanyWebsite(draft.company.trim(), website)
      await onSave(toPayload(draft, userId))
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-form-title"
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="w-full sm:max-w-[560px] max-h-[92dvh] sm:max-h-[calc(100dvh-48px)] flex flex-col bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]"
      >
        <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
          <h2 id="application-form-title" className="text-lg font-bold text-[var(--color-ink)]">
            {isEditMode ? 'Modifier la candidature' : 'Nouvelle candidature'}
          </h2>
          <button type="button" className="btn btn-ghost p-1.5" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <OfferEssentials
            draft={draft}
            onChange={patch}
            linkInputRef={linkInputRef}
            onImportClick={!isEditMode && FEATURES.ai ? () => setImporterOpen(true) : undefined}
            onCompanyBlur={handleCompanyBlur}
            logoLookupLoading={logoLookupLoading}
          />

          <StatusPicker
            status={draft.status}
            appliedAt={draft.appliedAt}
            onStatusChange={(status) => setDraft((prev) => withStatus(prev, status, localDateString(new Date())))}
            onAppliedAtChange={(appliedAt) => patch({ appliedAt })}
          />

          <div className="flex flex-col gap-2">
            <CollapsibleSection
              title="Plus de détails"
              hint="Lieu, contrat, site de l'entreprise"
              icon={SlidersHorizontal}
              open={sections.details}
              onToggle={() => setSections((s) => ({ ...s, details: !s.details }))}
            >
              <DetailsFields draft={draft} originalContract={initial?.contractType ?? ''} onChange={patch} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Notes"
              hint="Contact, impressions, points à préparer"
              icon={StickyNote}
              open={sections.notes}
              onToggle={() => setSections((s) => ({ ...s, notes: !s.notes }))}
            >
              <textarea
                aria-label="Notes"
                className="input resize-y"
                rows={4}
                placeholder="Contact, impressions, points à préparer…"
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </CollapsibleSection>
          </div>

          {externalError && <p role="alert" className="text-sm text-[var(--color-danger)]">{externalError}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[var(--color-border)]">
          <span className="hidden sm:block mr-auto text-xs text-[var(--color-subtle)]">
            Ctrl/⌘ + Entrée pour {isEditMode ? 'enregistrer' : 'ajouter'}
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button
            type="submit"
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            disabled={saving || !canSave}
          >
            {saving ? 'Enregistrement…' : isEditMode ? 'Enregistrer' : 'Ajouter la candidature'}
          </button>
        </footer>
      </form>

      {importerOpen && JobOfferImporter && (
        <Suspense fallback={null}>
          <JobOfferImporter onImport={handleImport} onClose={() => setImporterOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
