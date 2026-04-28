import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Application, ApplicationStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
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

interface ApplicationFormProps {
  initial?: Application | null
  userId: string
  onSave: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  externalError?: string | null
  onClose: () => void
}

export function ApplicationForm({ initial, userId, onSave, externalError, onClose }: ApplicationFormProps) {
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true)
    await onSave({
      userId,
      company: (fd.get('company') as string).trim(),
      position: (fd.get('position') as string).trim(),
      location: (fd.get('location') as string).trim() || null,
      contractType: (fd.get('contractType') as string).trim() || null,
      jobUrl: (fd.get('jobUrl') as string).trim() || null,
      status: fd.get('status') as ApplicationStatus,
      notes: (fd.get('notes') as string).trim() || null,
      appliedAt: null,
      resumeId: null,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-surface)] rounded-[var(--radius)] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="text-lg font-bold">{initial ? 'Modifier la candidature' : 'Nouvelle candidature'}</h3>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Entreprise *</label>
              <input className="input" name="company" defaultValue={initial?.company ?? ''} placeholder="Google" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Poste *</label>
              <input className="input" name="position" defaultValue={initial?.position ?? ''} placeholder="Développeur Frontend" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Lieu</label>
              <input className="input" name="location" defaultValue={initial?.location ?? ''} placeholder="Paris, France" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Contrat</label>
              <input className="input" name="contractType" defaultValue={initial?.contractType ?? ''} placeholder="CDI, CDD, Stage..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Statut</label>
              <select className="input" name="status" defaultValue={initial?.status ?? 'WISHLIST'}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">URL de l'offre</label>
              <input className="input" name="jobUrl" type="url" defaultValue={initial?.jobUrl ?? ''} placeholder="https://..." />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Notes</label>
            <textarea className="input resize-y" name="notes" rows={3} defaultValue={initial?.notes ?? ''} placeholder="Notes sur la candidature..." />
          </div>

          {externalError && (
            <p className="text-xs text-[var(--color-danger)]">{externalError}</p>
          )}

          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
