import { Sparkles } from 'lucide-react'
import type { ApplicationStatus } from '@/lib/types'

export interface ApplicationFormData {
  company: string
  position: string
  location: string
  contractType: string
  jobUrl: string
  status: ApplicationStatus
  appliedAt: string
  notes: string
}

interface ApplicationFormStepOfferProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
  showImport: boolean
  onImportClick: () => void
}

export function ApplicationFormStepOffer({ value, onChange, showImport, onImportClick }: ApplicationFormStepOfferProps) {
  return (
    <div className="flex flex-col gap-6">
      {showImport && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={onImportClick}>
          <Sparkles size={13} />
          Import IA
        </button>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Entreprise *</label>
          <input
            className="input text-base py-2.5"
            value={value.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Google"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Poste *</label>
          <input
            className="input text-base py-2.5"
            value={value.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="Développeur Frontend"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Lieu</label>
          <input
            className="input text-base py-2.5"
            value={value.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Paris, France"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Contrat</label>
          <input
            className="input text-base py-2.5"
            value={value.contractType}
            onChange={(e) => onChange({ contractType: e.target.value })}
            placeholder="CDI, CDD, Stage..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">URL de l'offre</label>
        <input
          className="input text-base py-2.5"
          type="url"
          value={value.jobUrl}
          onChange={(e) => onChange({ jobUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  )
}
