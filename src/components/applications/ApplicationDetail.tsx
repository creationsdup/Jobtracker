import { useEffect, useRef, useState } from 'react'
import { X, MapPin, FileText, Link as LinkIcon, Plus } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'
import type { Application, TimelineStep, StepStatus } from '@/lib/types'

interface ApplicationDetailProps {
  application: Application
  steps: TimelineStep[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onAddStep: (step: Omit<TimelineStep, 'id' | 'createdAt'>) => Promise<string | null>
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

export function ApplicationDetail({ application, steps, onEdit, onDelete, onClose, onAddStep }: ApplicationDetailProps) {
  const [addingStep, setAddingStep] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleAddStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setAddingStep(true)
    setStepError(null)
    const err = await onAddStep({
      applicationId: application.id,
      title: (fd.get('title') as string).trim() || 'Étape',
      date: fd.get('date') as string,
      time: (fd.get('time') as string) || null,
      status: fd.get('status') as StepStatus,
      notes: (fd.get('notes') as string).trim() || null,
      order: steps.length,
    })
    setAddingStep(false)
    if (err) { setStepError(err); return }
    formRef.current?.reset()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-surface)] rounded-[var(--radius)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h3 className="text-lg font-bold">{application.position}</h3>
            <p className="text-sm text-[var(--color-muted)]">{application.company}</p>
          </div>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-6 mt-4">
          {/* Meta */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <StatusBadge status={application.status} />
              {application.location && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <MapPin size={11} />{application.location}
                </span>
              )}
              {application.contractType && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
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
            <div className="flex gap-2 flex-shrink-0">
              <button className="btn btn-secondary btn-sm" onClick={onEdit}>Modifier</button>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Supprimer</button>
            </div>
          </div>

          {application.notes && (
            <p className="text-sm text-[var(--color-muted)] bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3">{application.notes}</p>
          )}

          {/* Timeline */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <h4 className="text-sm font-semibold mb-4">Timeline</h4>
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
                      <div className="font-semibold text-sm">{step.title}</div>
                      <div className="text-xs text-[var(--color-muted)] mt-0.5">
                        {formatDate(step.date)}{step.time ? ` à ${step.time}` : ''}
                      </div>
                      {step.notes && <div className="text-xs text-[var(--color-muted)] mt-1 italic">{step.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add step */}
            <form ref={formRef} onSubmit={handleAddStep} className="mt-4 p-4 bg-[var(--color-bg)] rounded-[var(--radius-sm)] flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                <Plus size={12} /> Ajouter une étape
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-xs" name="title" placeholder="Entretien RH, Test technique..." required />
                <select className="input text-xs" name="status">
                  <option value="UPCOMING">À venir</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-xs" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                <input className="input text-xs" name="time" type="time" />
              </div>
              <textarea className="input text-xs resize-y" name="notes" rows={2} placeholder="Notes..." />
              {stepError && <p className="text-xs text-[var(--color-danger)]">{stepError}</p>}
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary btn-sm" disabled={addingStep}>
                  {addingStep ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
