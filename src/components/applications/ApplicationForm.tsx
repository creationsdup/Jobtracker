import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Application, ApplicationStatus } from '@/lib/types'
import { guessCompanyWebsiteFromJobUrl } from '@/lib/jobBoards'
import { guessCompanyDomain } from '@/lib/ai'
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
  onSaveCompanyWebsite: (company: string, website: string) => Promise<string | null>
  existingCompanyWebsite?: string | null
  lookupCompanyDomain: (company: string) => string | undefined
  externalError?: string | null
  onClose: () => void
}

function buildFormData(
  initial: Application | null | undefined,
  imported: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>> | null,
  existingCompanyWebsite: string | null | undefined,
): ApplicationFormData {
  const source = imported ?? initial
  return {
    company: source?.company ?? '',
    position: source?.position ?? '',
    location: source?.location ?? '',
    contractType: source?.contractType ?? '',
    jobUrl: source?.jobUrl ?? '',
    companyWebsite: existingCompanyWebsite ?? '',
    status: source?.status ?? 'WISHLIST',
    appliedAt: source?.appliedAt ?? '',
    notes: source?.notes ?? '',
  }
}

export function ApplicationForm({ initial, userId, onSave, onSaveCompanyWebsite, existingCompanyWebsite, lookupCompanyDomain, externalError, onClose }: ApplicationFormProps) {
  const [saving, setSaving] = useState(false)
  const [importerOpen, setImporterOpen] = useState(false)
  const [importedData, setImportedData] = useState<Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>> | null>(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<ApplicationFormData>(() => buildFormData(initial, importedData, existingCompanyWebsite))
  const [aiLogoLookupLoading, setAiLogoLookupLoading] = useState(false)

  const isEditMode = !!initial

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function patchFormData(patch: Partial<ApplicationFormData>) {
    setFormData((prev) => {
      const next = { ...prev, ...patch }
      if (patch.jobUrl !== undefined && !prev.companyWebsite.trim()) {
        const guessed = guessCompanyWebsiteFromJobUrl(patch.jobUrl)
        if (guessed) next.companyWebsite = guessed
      }
      if (patch.company !== undefined && !prev.companyWebsite.trim()) {
        const known = lookupCompanyDomain(patch.company.trim())
        if (known) next.companyWebsite = known
      }
      return next
    })
  }

  // Si la saisie ne correspond à aucune entrée connue de la banque de logos, demande à l'IA
  // de reconnaître l'entreprise (sigle, marque) et trouver son domaine, puis l'enregistre dans
  // le catalogue partagé pour que les prochaines saisies (par n'importe quel utilisateur) soient
  // instantanées.
  async function handleCompanyBlur() {
    const company = formData.company.trim()
    if (!company || formData.companyWebsite.trim() || lookupCompanyDomain(company)) return
    setAiLogoLookupLoading(true)
    const domain = await guessCompanyDomain(company)
    setAiLogoLookupLoading(false)
    if (!domain) return
    setFormData((prev) => (prev.companyWebsite.trim() || prev.company.trim() !== company ? prev : { ...prev, companyWebsite: domain }))
    await onSaveCompanyWebsite(company, domain)
  }

  function handleImport(data: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>> & { companyWebsite?: string | null }) {
    setImportedData(data)
    const guessedWebsite = data.jobUrl ? guessCompanyWebsiteFromJobUrl(data.jobUrl) : null
    const resolvedWebsite = data.companyWebsite || guessedWebsite || existingCompanyWebsite
    setFormData(buildFormData(initial, data, resolvedWebsite))
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

  function canNavigateToStep(target: number) {
    return isEditMode || target <= step
  }

  function goToStep(target: number) {
    if (canNavigateToStep(target)) setStep(target)
  }

  async function handleSubmit() {
    if (!step1Valid) { setStep(1); return }
    setSaving(true)
    const website = formData.companyWebsite.trim()
    if (website) await onSaveCompanyWebsite(formData.company.trim(), website)
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
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-[var(--color-surface)] shadow-[var(--shadow-lg)] flex flex-col h-full">
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-bold">{initial ? 'Modifier la candidature' : 'Nouvelle candidature'}</h3>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="px-8 pt-5 pb-2 flex items-center gap-3">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={() => goToStep(s.id)}
                disabled={!canNavigateToStep(s.id)}
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
              onCompanyBlur={handleCompanyBlur}
              aiLogoLookupLoading={aiLogoLookupLoading}
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
