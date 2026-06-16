import type { ApplicationFormData } from './ApplicationFormStepOffer'

const STATUS_OPTIONS: { value: string; label: string }[] = [
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

interface ApplicationFormStepTrackingProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
}

export function ApplicationFormStepTracking({ value, onChange }: ApplicationFormStepTrackingProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Statut</label>
        <select
          className="input text-base py-2.5"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Date de candidature</label>
        <input
          className="input text-base py-2.5"
          type="date"
          value={value.appliedAt}
          onChange={(e) => onChange({ appliedAt: e.target.value })}
        />
      </div>
    </div>
  )
}
