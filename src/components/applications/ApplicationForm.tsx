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
