import { lazy, Suspense, useRef, useState } from 'react'
import { ListChecks, Mail, Pencil, Plus, Send, Target, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Application, TimelineStep, StepStatus, ApplicationStatus, UserGoal } from '@/lib/types'
import { MatchDetailsContent } from './MatchDetailsContent'
import { ApplicationDialog } from './ApplicationDialog'
import { ApplicationForm } from './ApplicationForm'
import { CollapsibleSection } from './form/CollapsibleSection'
import { DetailInfoSections, DetailSummary } from './detail/DetailSummary'
import { useProfile } from '@/hooks/useProfile'
import { useExperiences } from '@/hooks/useExperiences'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import { deriveApplicationStatusFromSteps, TIMELINE_PRESETS } from '@/lib/timelineStatus'
import { createDraft, initialSections, isStatusSelected, type ApplicationPayload } from '@/lib/applicationDraft'
import { stepCountLabel } from '@/lib/applicationSummary'
import { FEATURES } from '@/config/edition'

// WHY: condition littérale (pas FEATURES.ai) pour que Rollup supprime la lettre IA — et lib/ai —
// du build lite. Voir spec §3.3.
const CoverLetterGenerator = __APP_EDITION__ === 'full'
  ? lazy(() => import('./CoverLetterGenerator').then((m) => ({ default: m.CoverLetterGenerator })))
  : null

interface ApplicationDetailProps {
  application: Application
  userEmail: string
  steps: TimelineStep[]
  onDelete: () => void
  onClose: () => void
  /** Enregistre les modifications faites directement dans la fiche. */
  onUpdate: (data: ApplicationPayload) => Promise<string | null>
  onSaveCompanyWebsite: (company: string, website: string) => Promise<string | null>
  lookupCompanyDomain: (company: string) => string | undefined
  onAddStep: (step: Omit<TimelineStep, 'id' | 'createdAt'>) => Promise<string | null>
  onUpdateStep: (stepId: string, data: Partial<Omit<TimelineStep, 'id' | 'applicationId' | 'createdAt'>>) => Promise<string | null>
  onDeleteStep: (stepId: string) => Promise<string | null>
  onStatusChange: (status: ApplicationStatus) => Promise<string | null>
  resolveLogo?: (company: string) => string | undefined
  goal?: UserGoal | null
}

type SectionKey = 'details' | 'notes' | 'match'

const DOT_STYLES: Record<StepStatus, string> = {
  COMPLETED:  'bg-green-100 text-green-700 border-2 border-green-500',
  IN_PROGRESS:'bg-blue-100 text-blue-700 border-2 border-blue-500',
  UPCOMING:   'bg-[var(--color-bg)] text-[var(--color-muted)] border-2 border-[var(--color-border)]',
  CANCELLED:  'bg-red-50 text-red-400 border-2 border-red-200',
}

const DOT_CHARS: Record<StepStatus, string> = {
  COMPLETED: '✓',
  IN_PROGRESS: '●',
  UPCOMING: '○',
  CANCELLED: '✕',
}

function findPresetIcon(title: string): string {
  return TIMELINE_PRESETS.find((p) => p.title === title)?.icon ?? '📌'
}

export function ApplicationDetail({
  application,
  userEmail,
  steps,
  onDelete,
  onClose,
  onUpdate,
  onSaveCompanyWebsite,
  lookupCompanyDomain,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onStatusChange,
  resolveLogo,
  goal,
}: ApplicationDetailProps) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(application), goal) : null
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(() => ({
    ...initialSections(createDraft(application)),
    match: false,
  }))
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  // WHY: une fois passée en modification, la fiche et son formulaire se remplacent sans rejouer l'animation d'ouverture.
  const [switchedInPlace, setSwitchedInPlace] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [savingStepId, setSavingStepId] = useState<string | null>(null)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [coverLetterOpen, setCoverLetterOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customStepOpen, setCustomStepOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)
  const { profile } = useProfile(application.userId, userEmail)
  // WHY: les expériences ne servent qu'à la lettre IA ; pas de requête sur "Experience" en lite.
  const { experiences } = useExperiences(FEATURES.ai ? application.userId : null)
  const logoUrl = resolveLogo?.(application.company) ?? null
  // WHY: la puce cliquée s'allume tout de suite, sans attendre la réponse de Supabase.
  const shownApplication = pendingStatus ? { ...application, status: pendingStatus } : application

  function toggleSection(key: SectionKey) {
    setSections((current) => ({ ...current, [key]: !current[key] }))
  }

  function startEditing() {
    setEditError(null)
    setSwitchedInPlace(true)
    setEditing(true)
  }

  function stopEditing() {
    setEditError(null)
    setEditing(false)
  }

  async function handleEditSave(data: ApplicationPayload) {
    setEditError(null)
    const err = await onUpdate(data)
    if (err) {
      setEditError(err)
      return
    }
    // Les blocs qui viennent d'être remplis s'ouvrent au retour sur la fiche.
    setSections((current) => ({ ...current, ...initialSections(createDraft(data)) }))
    setEditing(false)
  }

  async function handleStatusSelect(column: ApplicationStatus) {
    if (isStatusSelected(shownApplication.status, column)) return
    setStatusError(null)
    setPendingStatus(column)
    const err = await onStatusChange(column)
    setPendingStatus(null)
    if (err) setStatusError(err)
  }

  async function syncApplicationStatus(nextSteps: TimelineStep[], explicitStatus?: ApplicationStatus | '') {
    const targetStatus = explicitStatus || deriveApplicationStatusFromSteps(nextSteps) || (nextSteps.length === 0 ? 'WISHLIST' : null)
    if (!targetStatus || targetStatus === application.status) return null
    return onStatusChange(targetStatus)
  }

  async function handleAddStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err = await submitStep({
      title: (fd.get('title') as string).trim() || 'Étape',
      date: fd.get('date') as string,
      time: (fd.get('time') as string) || null,
      status: fd.get('status') as StepStatus,
      notes: (fd.get('notes') as string).trim() || null,
      nextStatus: ((fd.get('nextStatus') as string) || '') as ApplicationStatus | '',
    })
    if (err) return
    formRef.current?.reset()
    setCustomStepOpen(false)
    setPickerOpen(false)
  }

  async function submitStep({
    title,
    date,
    time,
    status,
    notes,
    nextStatus,
  }: {
    title: string
    date: string
    time: string | null
    status: StepStatus
    notes: string | null
    nextStatus?: ApplicationStatus | ''
  }) {
    setAddingStep(true)
    setStepError(null)
    const nextStep: TimelineStep = {
      id: crypto.randomUUID(),
      applicationId: application.id,
      title,
      date,
      time,
      notes,
      status,
      order: steps.length,
      createdAt: new Date().toISOString(),
    }

    const err = await onAddStep({
      applicationId: application.id,
      title,
      date,
      time,
      status,
      notes,
      order: steps.length,
    })
    if (err) {
      setAddingStep(false)
      setStepError(err)
      return err
    }

    const statusError = await syncApplicationStatus([...steps, nextStep], nextStatus)
    if (statusError) {
      setAddingStep(false)
      setStepError(statusError)
      return statusError
    }

    setAddingStep(false)
    return null
  }

  async function handleRelance() {
    setStepError(null)
    const today = new Date().toISOString().split('T')[0]
    await submitStep({
      title: 'Relance envoyée',
      date: today,
      time: null,
      status: 'COMPLETED',
      notes: null,
    })
  }

  async function handlePresetSelect(preset: (typeof TIMELINE_PRESETS)[number]) {
    setStepError(null)
    if (preset.title === 'Étape libre') {
      setPickerOpen(true)
      setCustomStepOpen(true)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const err = await submitStep({
      title: preset.title,
      date: today,
      time: null,
      status: preset.stepStatus,
      notes: null,
      nextStatus: preset.nextStatus,
    })
    if (!err) {
      setPickerOpen(false)
      setCustomStepOpen(false)
    }
  }

  async function handleUpdateStep(e: React.FormEvent<HTMLFormElement>, step: TimelineStep) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nextStatus = ((fd.get('nextStatus') as string) || '') as ApplicationStatus | ''
    const nextStepData = {
      title: (fd.get('title') as string).trim() || 'Étape',
      date: fd.get('date') as string,
      time: (fd.get('time') as string) || null,
      status: fd.get('status') as StepStatus,
      notes: (fd.get('notes') as string).trim() || null,
    }
    setSavingStepId(step.id)
    setStepError(null)

    const err = await onUpdateStep(step.id, nextStepData)

    if (err) {
      setSavingStepId(null)
      setStepError(err)
      return
    }

    const nextTimelineSteps = steps.map((currentStep) =>
      currentStep.id === step.id ? { ...currentStep, ...nextStepData } : currentStep,
    )
    const statusError = await syncApplicationStatus(nextTimelineSteps, nextStatus)
    if (statusError) {
      setSavingStepId(null)
      setStepError(statusError)
      return
    }

    setSavingStepId(null)
    setEditingStepId(null)
  }

  async function handleDeleteStep(stepId: string) {
    if (!window.confirm('Supprimer cette étape ?')) return
    setDeletingStepId(stepId)
    setStepError(null)
    const err = await onDeleteStep(stepId)
    if (err) {
      setDeletingStepId(null)
      setStepError(err)
      return
    }

    const statusError = await syncApplicationStatus(steps.filter((step) => step.id !== stepId))
    if (statusError) {
      setDeletingStepId(null)
      setStepError(statusError)
      return
    }

    if (editingStepId === stepId) setEditingStepId(null)
    setDeletingStepId(null)
  }

  // « Modifier » transforme la fiche en formulaire dans la même fenêtre ; Enregistrer ou Annuler la remet en lecture.
  if (editing) {
    return (
      <ApplicationForm
        initial={application}
        userId={application.userId}
        onSave={handleEditSave}
        onSaveCompanyWebsite={onSaveCompanyWebsite}
        existingCompanyWebsite={logoUrl}
        lookupCompanyDomain={lookupCompanyDomain}
        externalError={editError}
        onClose={stopEditing}
        appear={false}
      />
    )
  }

  const coverLetter = coverLetterOpen && CoverLetterGenerator && (
    <Suspense fallback={null}>
      <CoverLetterGenerator
        application={application}
        profile={profile ? { ...profile, email: profile.email || userEmail } : null}
        experiences={experiences}
        onClose={() => setCoverLetterOpen(false)}
      />
    </Suspense>
  )

  // Colonne de droite : les actions, puis la timeline.
  const aside = (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary flex-1" onClick={startEditing}>
          <Pencil size={14} aria-hidden />
          Modifier
        </button>
        {FEATURES.ai && (
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setCoverLetterOpen(true)}>
            <Mail size={14} aria-hidden />
            Lettre IA
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary text-[var(--color-danger)] hover:text-[var(--color-danger-dark)] hover:border-[var(--color-danger)]"
          onClick={onDelete}
        >
          <Trash2 size={14} aria-hidden />
          Supprimer
        </button>
      </div>

      <section className="flex flex-col gap-3" aria-label="Timeline">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-ink)]">
            <ListChecks size={14} aria-hidden />
            Timeline
          </h3>
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)]">
            {stepCountLabel(steps.length)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-bg)] disabled:opacity-50"
            onClick={() => void handleRelance()}
            disabled={addingStep}
          >
            <Send size={13} />
            Relancer
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
            aria-expanded={pickerOpen}
            onClick={() => {
              setPickerOpen((current) => !current)
              setCustomStepOpen(false)
              setStepError(null)
            }}
          >
            <Plus size={13} />
            Ajouter une étape
          </button>
        </div>

        {pickerOpen && (
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 animate-fade-slide-down">
            <div className="grid grid-cols-2 gap-2">
              {TIMELINE_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  className="flex min-h-[96px] flex-col items-start justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)]"
                  onClick={() => void handlePresetSelect(preset)}
                  disabled={addingStep}
                >
                  <div className="text-xl leading-none">{preset.icon}</div>
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--color-ink)]">{preset.title}</div>
                    <div className="mt-0.5 text-[11px] leading-4 text-[var(--color-muted)]">{preset.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>

            {customStepOpen && (
              <form ref={formRef} onSubmit={handleAddStep} className="mt-3 flex flex-col gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3 animate-fade-slide-down">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Étape libre
                </div>
                <input className="input text-xs" name="title" placeholder="Nom de l'étape" required />
                <select className="input text-xs" name="status" defaultValue="UPCOMING">
                  <option value="UPCOMING">À venir</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminée</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
                <div className="grid grid-cols-2 gap-2.5">
                  <input className="input text-xs" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  <input className="input text-xs" name="time" type="time" />
                </div>
                <select className="input text-xs" name="nextStatus" defaultValue="">
                  <option value="">Statut inchangé</option>
                  <option value="APPLIED">Postulée</option>
                  <option value="INTERVIEW">Entretien</option>
                  <option value="OFFER">Offre</option>
                  <option value="REJECTED">Refusée</option>
                </select>
                <textarea className="input text-xs resize-y" name="notes" rows={2} placeholder="Notes..." />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setCustomStepOpen(false)
                      setStepError(null)
                    }}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addingStep}>
                    {addingStep ? 'Ajout…' : 'Créer l’étape'}
                  </button>
                </div>
              </form>
            )}

            {stepError && <p className="mt-3 text-xs text-[var(--color-danger)]">{stepError}</p>}
          </div>
        )}

        {steps.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)] py-2">Aucune étape. Ajoutez la première !</p>
        ) : (
          <div className="flex flex-col">
            {steps.map((step, i) => (
              <div key={step.id} className="flex gap-3 py-3 relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[11px] top-9 bottom-[-12px] w-0.5 bg-[var(--color-border)]" />
                )}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${DOT_STYLES[step.status]}`}>
                  {DOT_CHARS[step.status]}
                </div>
                <div className="flex-1 min-w-0">
                  {editingStepId === step.id ? (
                    <form
                      ref={editFormRef}
                      onSubmit={(e) => void handleUpdateStep(e, step)}
                      className="flex flex-col gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 animate-fade-slide-down"
                    >
                      <input className="input text-xs" name="title" defaultValue={step.title} required />
                      <select className="input text-xs" name="status" defaultValue={step.status}>
                        <option value="UPCOMING">À venir</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="COMPLETED">Terminée</option>
                        <option value="CANCELLED">Annulée</option>
                      </select>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input className="input text-xs" name="date" type="date" defaultValue={step.date} required />
                        <input className="input text-xs" name="time" type="time" defaultValue={step.time ?? ''} />
                      </div>
                      <select className="input text-xs" name="nextStatus" defaultValue="">
                        <option value="">Statut inchangé</option>
                        <option value="APPLIED">Postulée</option>
                        <option value="INTERVIEW">Entretien</option>
                        <option value="OFFER">Offre</option>
                        <option value="REJECTED">Refusée</option>
                      </select>
                      <textarea className="input text-xs resize-y" name="notes" rows={2} defaultValue={step.notes ?? ''} />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingStepId(null)
                            setStepError(null)
                          }}
                        >
                          Annuler
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={savingStepId === step.id}>
                          {savingStepId === step.id ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            <span className="text-base leading-none">{findPresetIcon(step.title)}</span>
                            <span className="truncate">{step.title}</span>
                          </div>
                          <div className="text-xs text-[var(--color-muted)] mt-0.5">
                            {formatDate(step.date)}{step.time ? ` à ${step.time}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm px-2"
                            aria-label="Modifier l'étape"
                            onClick={() => {
                              setEditingStepId(step.id)
                              setStepError(null)
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm px-2 text-[var(--color-danger)] hover:text-[var(--color-danger-dark)]"
                            aria-label="Supprimer l'étape"
                            onClick={() => void handleDeleteStep(step.id)}
                            disabled={deletingStepId === step.id}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {step.notes && <div className="text-xs text-[var(--color-muted)] mt-1 italic">{step.notes}</div>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {stepError && !pickerOpen && <p className="text-xs text-[var(--color-danger)]">{stepError}</p>}
      </section>
    </>
  )

  return (
    <ApplicationDialog title="Fiche candidature" onClose={onClose} aside={aside} overlays={coverLetter} appear={!switchedInPlace}>
      <DetailSummary
        application={shownApplication}
        logoUrl={logoUrl}
        statusError={statusError}
        onStatusSelect={(status) => void handleStatusSelect(status)}
      />

      <div className="flex flex-col gap-2">
        <DetailInfoSections application={application} logoUrl={logoUrl} sections={sections} onToggleSection={toggleSection} />

        {match && (
          <CollapsibleSection
            title="Correspondance avec votre objectif"
            hint="Voir le détail du score"
            icon={Target}
            open={sections.match}
            onToggle={() => toggleSection('match')}
          >
            <MatchDetailsContent result={match} showHeader={false} />
          </CollapsibleSection>
        )}
      </div>
    </ApplicationDialog>
  )
}
