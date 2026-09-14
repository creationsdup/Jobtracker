import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Application } from '@/lib/types'
import { guessCompanyWebsiteFromJobUrl } from '@/lib/jobBoards'
import { findCompanyDomain } from '@/lib/companyLookup'
import { FEATURES } from '@/config/edition'
import {
  canSaveDraft,
  createDraft,
  localDateString,
  patchDraft,
  toPayload,
  withStatus,
  type ApplicationDraft,
  type ApplicationPayload,
} from '@/lib/applicationDraft'
import { ApplicationDialog } from './ApplicationDialog'
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
  /** false quand le formulaire remplace la fiche sur place (pas d'animation d'ouverture). */
  appear?: boolean
}

export function ApplicationForm({ initial, userId, onSave, onSaveCompanyWebsite, existingCompanyWebsite, lookupCompanyDomain, externalError, onClose, appear = true }: ApplicationFormProps) {
  const isEditMode = !!initial
  const [draft, setDraft] = useState<ApplicationDraft>(() => createDraft(initial, existingCompanyWebsite))
  const [saving, setSaving] = useState(false)
  const [importerOpen, setImporterOpen] = useState(false)
  const [logoLookupLoading, setLogoLookupLoading] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const canSave = canSaveDraft(draft)

  useEffect(() => {
    if (!isEditMode) linkInputRef.current?.focus()
  }, [isEditMode])

  function patch(changes: Partial<ApplicationDraft>) {
    setDraft((prev) => patchDraft(prev, changes, lookupCompanyDomain))
  }

  // Si la saisie ne correspond à aucune entrée connue de la banque de logos, cherche le site de
  // l'entreprise (autocomplétion Clearbit) pour pré-remplir le champ ; il est enregistré à l'ajout.
  // En édition full seulement, l'IA prend le relais si Clearbit ne trouve rien (sigle, marque) et
  // sa réponse rejoint aussitôt le catalogue partagé.
  async function handleCompanyBlur() {
    const company = draft.company.trim()
    if (!company || draft.companyWebsite.trim() || lookupCompanyDomain(company)) return
    setLogoLookupLoading(true)
    let domain: string | null = null
    let guessedByAi = false
    try {
      domain = await findCompanyDomain(company)
      // WHY: condition littérale en premier pour que Rollup supprime l'import de lib/ai du build lite (spec §3.3).
      if (__APP_EDITION__ === 'full' && !domain) {
        // WHY: si l'import dynamique ou l'appel IA échoue (déploiement obsolète, hors-ligne), on se
        // comporte comme si aucun domaine n'avait été trouvé plutôt que de laisser planter le flux
        // ou bloquer logoLookupLoading à true indéfiniment.
        const { guessCompanyDomain } = await import('@/lib/ai')
        domain = await guessCompanyDomain(company)
        guessedByAi = true
      }
    } catch {
      return
    } finally {
      setLogoLookupLoading(false)
    }
    if (!domain) return
    const found = domain
    setDraft((prev) => (prev.companyWebsite.trim() || prev.company.trim() !== company ? prev : { ...prev, companyWebsite: found }))
    if (guessedByAi) await onSaveCompanyWebsite(company, found)
  }

  function handleImport(data: Partial<ApplicationPayload> & { companyWebsite?: string | null }) {
    const guessedWebsite = data.jobUrl ? guessCompanyWebsiteFromJobUrl(data.jobUrl) : null
    setDraft(createDraft(data, data.companyWebsite || guessedWebsite || existingCompanyWebsite))
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

  // Colonne de droite : les boutons, puis les notes sur toute la hauteur restante.
  const aside = (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          disabled={saving || !canSave}
        >
          {saving ? 'Enregistrement…' : isEditMode ? 'Enregistrer' : 'Ajouter la candidature'}
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={onClose} disabled={saving}>Annuler</button>
        <span className="hidden sm:block text-center text-xs text-[var(--color-subtle)]">
          Ctrl/⌘ + Entrée pour {isEditMode ? 'enregistrer' : 'ajouter'}
        </span>
        {externalError && <p role="alert" className="text-sm text-[var(--color-danger)]">{externalError}</p>}
      </div>

      <div className="flex flex-col gap-1.5 md:flex-1">
        <label htmlFor="application-notes" className="text-xs font-medium text-[var(--color-ink-secondary)]">Notes</label>
        <textarea
          id="application-notes"
          className="input resize-y md:resize-none md:flex-1 min-h-[160px]"
          rows={6}
          placeholder="Contact, impressions, points à préparer…"
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </div>
    </>
  )

  const importer = importerOpen && JobOfferImporter && (
    <Suspense fallback={null}>
      <JobOfferImporter onImport={handleImport} onClose={() => setImporterOpen(false)} />
    </Suspense>
  )

  return (
    <ApplicationDialog
      title={isEditMode ? 'Modifier la candidature' : 'Nouvelle candidature'}
      onClose={onClose}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      aside={aside}
      overlays={importer}
      appear={appear}
    >
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

      <DetailsFields draft={draft} originalContract={initial?.contractType ?? ''} onChange={patch} />
    </ApplicationDialog>
  )
}
