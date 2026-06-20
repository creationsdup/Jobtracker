import { useEffect, useRef, useState } from 'react'
import { X, MapPin, FileText, Link as LinkIcon, Plus, Mail, Pencil, Trash2, Send, Target } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { CompanyLogo } from './CompanyLogo'
import { formatDate } from '@/lib/utils'
import type { Application, TimelineStep, StepStatus, ApplicationStatus, UserGoal } from '@/lib/types'
import { CoverLetterGenerator } from './CoverLetterGenerator'
import { MatchScoreBadge } from './MatchScoreBadge'
import { MatchDetailsModal } from './MatchDetailsModal'
import { useProfile } from '@/hooks/useProfile'
import { useExperiences } from '@/hooks/useExperiences'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import { deriveApplicationStatusFromSteps, TIMELINE_PRESETS } from '@/lib/timelineStatus'

interface ApplicationDetailProps {
  application: Application
  userEmail: string
  steps: TimelineStep[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onAddStep: (step: Omit<TimelineStep, 'id' | 'createdAt'>) => Promise<string | null>
  onUpdateStep: (stepId: string, data: Partial<Omit<TimelineStep, 'id' | 'applicationId' | 'createdAt'>>) => Promise<string | null>
  onDeleteStep: (stepId: string) => Promise<string | null>
  onStatusChange: (status: ApplicationStatus) => Promise<string | null>
  resolveLogo?: (company: string) => string | undefined
  goal?: UserGoal | null
}

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
  onEdit,
  onDelete,
  onClose,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onStatusChange,
  resolveLogo,
  goal,
}: ApplicationDetailProps) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(application), goal) : null
  const [showMatchDetails, setShowMatchDetails] = useState(false)
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
  const { experiences } = useExperiences(application.userId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-[var(--color-surface)] shadow-[var(--shadow-lg)] flex flex-col h-full animate-slide-in-right">
        <div className="flex items-start justify-between px-6 pt-5 pb-5 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <CompanyLogo company={application.company} logoUrl={resolveLogo?.(application.company) ?? null} size={44} />
            <div>
              <h3 className="text-lg font-bold">{application.position}</h3>
              <p className="text-sm text-[var(--color-muted)]">{application.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="btn btn-secondary btn-sm" onClick={() => setCoverLetterOpen(true)}>
              <Mail size={13} />
              Lettre IA
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>
              <Pencil size={13} />
              Modifier
            </button>
            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
            <button className="btn btn-ghost btn-sm p-2 text-[var(--color-danger)] hover:text-[var(--color-danger-dark)]" onClick={onDelete} title="Supprimer">
              <Trash2 size={14} />
            </button>
            <button className="btn btn-ghost p-1" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6 mt-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={application.status} />
            {application.location && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <MapPin size={11} />{application.location}
              </span>
            )}
            {application.contractType && (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-cerulean-light)', color: 'var(--color-accent)' }}
              >
                <FileText size={11} />{application.contractType}
              </span>
            )}
            {application.jobUrl && (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <LinkIcon size={11} />Voir l'offre
              </a>
            )}
          </div>

          {match && (
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Target size={13} />
                Correspondance avec votre objectif
              </h4>
              <MatchScoreBadge result={match} onClick={() => setShowMatchDetails(true)} />
            </div>
          )}

          {application.notes && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-sm font-semibold">Notes</h4>
              <p className="text-sm text-[var(--color-muted)] bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3">{application.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Timeline</h4>
                <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)] border border-[rgba(60,52,137,0.12)]">
                  {steps.length} étape{steps.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-bg)] disabled:opacity-50"
                  onClick={() => void handleRelance()}
                  disabled={addingStep}
                >
                  <Send size={13} />
                  Relancer
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:bg-[var(--color-primary-dark)]"
                  onClick={() => {
                    setPickerOpen((current) => !current)
                    setCustomStepOpen(false)
                    setStepError(null)
                  }}
                >
                  <Plus size={13} />
                  Ajouter
                </button>
              </div>
            </div>

            {pickerOpen && (
              <div className="mb-5 rounded-[var(--radius)] border border-[rgba(60,52,137,0.12)] bg-white/85 p-4 shadow-[0_16px_36px_rgba(31,27,77,0.08)] backdrop-blur-sm animate-fade-slide-down">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {TIMELINE_PRESETS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      className="flex min-h-[118px] flex-col items-start justify-between rounded-[var(--radius-sm)] border border-[rgba(60,52,137,0.12)] bg-[rgba(255,255,255,0.92)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.36)] hover:shadow-[0_14px_28px_rgba(59,130,246,0.12)]"
                      onClick={() => void handlePresetSelect(preset)}
                      disabled={addingStep}
                    >
                      <div className="text-2xl leading-none">{preset.icon}</div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-ink)]">{preset.title}</div>
                        <div className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{preset.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {customStepOpen && (
                  <form ref={formRef} onSubmit={handleAddStep} className="mt-4 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[rgba(60,52,137,0.12)] bg-[var(--color-bg)]/85 p-4 animate-fade-slide-down">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Étape libre
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="input text-xs" name="title" placeholder="Nom de l'étape" required />
                      <select className="input text-xs" name="status" defaultValue="UPCOMING">
                        <option value="UPCOMING">À venir</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="COMPLETED">Terminée</option>
                        <option value="CANCELLED">Annulée</option>
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input className="input text-xs" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                      <input className="input text-xs" name="time" type="time" />
                      <select className="input text-xs" name="nextStatus" defaultValue="">
                        <option value="">Statut inchangé</option>
                        <option value="APPLIED">Postulée</option>
                        <option value="INTERVIEW">Entretien</option>
                        <option value="OFFER">Offre</option>
                        <option value="REJECTED">Refusée</option>
                      </select>
                    </div>
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
                  <div key={step.id} className="flex gap-4 py-3 relative">
                    {i < steps.length - 1 && (
                      <div className="absolute left-[11px] top-9 bottom-[-12px] w-0.5 bg-[var(--color-border)]" />
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${DOT_STYLES[step.status]}`}>
                      {DOT_CHARS[step.status]}
                    </div>
                    <div className="flex-1">
                      {editingStepId === step.id ? (
                        <form
                          ref={editFormRef}
                          onSubmit={(e) => void handleUpdateStep(e, step)}
                          className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[rgba(60,52,137,0.12)] bg-[var(--color-bg)]/85 p-4 animate-fade-slide-down"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <input className="input text-xs" name="title" defaultValue={step.title} required />
                            <select className="input text-xs" name="status" defaultValue={step.status}>
                              <option value="UPCOMING">À venir</option>
                              <option value="IN_PROGRESS">En cours</option>
                              <option value="COMPLETED">Terminée</option>
                              <option value="CANCELLED">Annulée</option>
                            </select>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <input className="input text-xs" name="date" type="date" defaultValue={step.date} required />
                            <input className="input text-xs" name="time" type="time" defaultValue={step.time ?? ''} />
                            <select className="input text-xs" name="nextStatus" defaultValue="">
                              <option value="">Statut inchangé</option>
                              <option value="APPLIED">Postulée</option>
                              <option value="INTERVIEW">Entretien</option>
                              <option value="OFFER">Offre</option>
                              <option value="REJECTED">Refusée</option>
                            </select>
                          </div>
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
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-1.5">
                                <span className="text-base leading-none">{findPresetIcon(step.title)}</span>
                                {step.title}
                              </div>
                              <div className="text-xs text-[var(--color-muted)] mt-0.5">
                                {formatDate(step.date)}{step.time ? ` à ${step.time}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm px-2"
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
            {stepError && !pickerOpen && <p className="mt-3 text-xs text-[var(--color-danger)]">{stepError}</p>}
          </div>
        </div>
      </div>

      {coverLetterOpen && (
        <CoverLetterGenerator
          application={application}
          profile={profile ? { ...profile, email: profile.email || userEmail } : null}
          experiences={experiences}
          onClose={() => setCoverLetterOpen(false)}
        />
      )}

      {showMatchDetails && match && (
        <MatchDetailsModal result={match} onClose={() => setShowMatchDetails(false)} />
      )}
    </div>
  )
}
