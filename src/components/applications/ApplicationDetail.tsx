import { useEffect } from 'react'
import { X, MapPin, FileText, DollarSign, Link as LinkIcon, Plus } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'
import { STEP_LABELS, STEP_TO_STATUS, type Application, type TimelineStep, type StepType, type StepStatus } from '@/lib/types'

interface ApplicationDetailProps {
  application: Application
  steps: TimelineStep[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onAddStep: (step: Omit<TimelineStep, 'id' | 'created_at'>) => void
}

const STEP_TYPE_OPTIONS: { value: StepType; label: string }[] = [
  { value: 'applied', label: 'Candidature envoyée' },
  { value: 'confirmation', label: 'Accusé de réception' },
  { value: 'interview_hr', label: 'Entretien RH' },
  { value: 'interview_manager', label: 'Entretien manager' },
  { value: 'test', label: 'Test / Cas pratique' },
  { value: 'offer', label: 'Offre reçue' },
  { value: 'rejected', label: 'Refus' },
  { value: 'custom', label: 'Étape libre' },
]

const DOT_CLASSES: Record<StepStatus, string> = {
  done: 'bg-green-100 text-green-700 border-2 border-green-500',
  current: 'bg-blue-100 text-blue-700 border-2 border-blue-500',
  upcoming: 'bg-[var(--color-bg)] text-[var(--color-muted)] border-2 border-[var(--color-border)]',
}

const DOT_CHARS: Record<StepStatus, string> = {
  done: '✓',
  current: '●',
  upcoming: '○',
}

export function ApplicationDetail({ application, steps, onEdit, onDelete, onClose, onAddStep }: ApplicationDetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleAddStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const type = fd.get('step_type') as StepType
    const customTitle = (fd.get('custom_title') as string).trim()
    const title = type === 'custom' ? (customTitle || 'Étape libre') : STEP_LABELS[type]

    onAddStep({
      application_id: application.id,
      title,
      step_type: type,
      date: fd.get('date') as string,
      time: fd.get('time') as string,
      status: fd.get('status') as StepStatus,
      notes: (fd.get('notes') as string).trim(),
    })
    e.currentTarget.reset()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-surface)] rounded-[var(--radius)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h3 className="text-lg font-bold">{application.role}</h3>
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
              {application.contract_type && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <FileText size={11} />{application.contract_type}
                </span>
              )}
              {application.salary && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <DollarSign size={11} />{application.salary}
                </span>
              )}
              {application.url && (
                <a
                  href={application.url}
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
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${DOT_CLASSES[step.status]}`}>
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

            {/* Add step form */}
            <form onSubmit={handleAddStep} className="mt-4 p-4 bg-[var(--color-bg)] rounded-[var(--radius-sm)] flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
                <Plus size={12} /> Ajouter une étape
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="input text-xs" name="step_type">
                  {STEP_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select className="input text-xs" name="status">
                  <option value="done">Terminé</option>
                  <option value="current">En cours</option>
                  <option value="upcoming">À venir</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-xs" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                <input className="input text-xs" name="time" type="time" />
              </div>
              <input className="input text-xs" name="custom_title" placeholder="Titre (si étape libre)" />
              <textarea className="input text-xs resize-y" name="notes" rows={2} placeholder="Notes..." />
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary btn-sm">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export { STEP_TO_STATUS }
