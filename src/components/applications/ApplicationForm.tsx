import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Application, ApplicationStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Sauvegardée' },
  { value: 'applied', label: 'Postulée' },
  { value: 'interview', label: 'Entretien' },
  { value: 'offer', label: 'Offre reçue' },
  { value: 'rejected', label: 'Refusée' },
]

interface ApplicationFormProps {
  initial?: Application | null
  onSave: (data: Omit<Application, 'id' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}

export function ApplicationForm({ initial, onSave, onClose }: ApplicationFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      company: (fd.get('company') as string).trim(),
      role: (fd.get('role') as string).trim(),
      location: (fd.get('location') as string).trim(),
      contract_type: (fd.get('contract_type') as string).trim(),
      salary: (fd.get('salary') as string).trim(),
      status: fd.get('status') as ApplicationStatus,
      url: (fd.get('url') as string).trim(),
      description: (fd.get('description') as string).trim(),
    })
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

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Entreprise *</label>
              <input className="input" name="company" defaultValue={initial?.company ?? ''} placeholder="Google" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Poste *</label>
              <input className="input" name="role" defaultValue={initial?.role ?? ''} placeholder="Développeur Frontend" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Lieu</label>
              <input className="input" name="location" defaultValue={initial?.location ?? ''} placeholder="Paris, France" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Contrat</label>
              <input className="input" name="contract_type" defaultValue={initial?.contract_type ?? ''} placeholder="CDI, CDD, Stage..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Salaire</label>
              <input className="input" name="salary" defaultValue={initial?.salary ?? ''} placeholder="45 000€" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Statut</label>
              <select className="input" name="status" defaultValue={initial?.status ?? 'saved'}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">URL de l'offre</label>
            <input className="input" name="url" type="url" defaultValue={initial?.url ?? ''} placeholder="https://..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Notes</label>
            <textarea className="input resize-y" name="description" rows={3} defaultValue={initial?.description ?? ''} placeholder="Notes sur la candidature..." />
          </div>

          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}
