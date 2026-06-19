import { Sparkles } from 'lucide-react'
import type { ApplicationStatus } from '@/lib/types'

export interface ApplicationFormData {
  company: string
  position: string
  location: string
  contractType: string
  jobUrl: string
  companyWebsite: string
  status: ApplicationStatus
  appliedAt: string
  notes: string
}

interface ApplicationFormStepOfferProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
  showImport: boolean
  onImportClick: () => void
  onCompanyBlur?: () => void
  aiLogoLookupLoading?: boolean
}

export function ApplicationFormStepOffer({ value, onChange, showImport, onImportClick, onCompanyBlur, aiLogoLookupLoading }: ApplicationFormStepOfferProps) {
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
          <label className="text-xs font-medium">Entreprise *</label>
          <input
            className="input text-sm py-2"
            value={value.company}
            onChange={(e) => onChange({ company: e.target.value })}
            onBlur={onCompanyBlur}
            placeholder="Google"
          />
          {aiLogoLookupLoading && (
            <span className="text-xs text-[var(--color-muted)]">Recherche du logo…</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Poste *</label>
          <input
            className="input text-sm py-2"
            value={value.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="Développeur Frontend"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Lieu</label>
          <input
            className="input text-sm py-2"
            value={value.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Paris, France"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Contrat</label>
          <select
            className="input text-sm py-2"
            value={value.contractType}
            onChange={(e) => onChange({ contractType: e.target.value })}
          >
            <option value="">Sélectionner...</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="STAGE">Stage</option>
            <option value="ALTERNANCE">Alternance</option>
            <option value="CDI-Graduate Program">CDI-Graduate Program</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">URL de l'offre</label>
          <input
            className="input text-sm py-2"
            type="url"
            value={value.jobUrl}
            onChange={(e) => onChange({ jobUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Site web de l'entreprise</label>
          <input
            className="input text-sm py-2"
            type="url"
            value={value.companyWebsite}
            onChange={(e) => onChange({ companyWebsite: e.target.value })}
            placeholder="https://exemple.com"
          />
        </div>
      </div>
    </div>
  )
}
