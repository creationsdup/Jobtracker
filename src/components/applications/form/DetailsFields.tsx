import { contractOptions, isContractSelected, toggleContract, type ApplicationDraft } from '@/lib/applicationDraft'
import { ChoiceChips } from './ChoiceChips'

interface DetailsFieldsProps {
  draft: ApplicationDraft
  /** Contrat enregistré à l'ouverture, gardé comme puce même s'il ne fait pas partie de la liste. */
  originalContract: string
  onChange: (patch: Partial<ApplicationDraft>) => void
}

const LABEL_CLASS = 'text-xs font-medium text-[var(--color-ink-secondary)]'

export function DetailsFields({ draft, originalContract, onChange }: DetailsFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="application-location" className={LABEL_CLASS}>Lieu</label>
          <input
            id="application-location"
            autoComplete="address-level2"
            className="input"
            placeholder="Paris, télétravail…"
            value={draft.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="application-company-website" className={LABEL_CLASS}>Site de l'entreprise</label>
          <input
            id="application-company-website"
            type="url"
            inputMode="url"
            className="input"
            placeholder="https://exemple.com"
            value={draft.companyWebsite}
            onChange={(e) => onChange({ companyWebsite: e.target.value })}
          />
        </div>
      </div>

      <ChoiceChips
        label="Contrat"
        options={contractOptions(originalContract)}
        isSelected={(value) => isContractSelected(draft.contractType, value)}
        onSelect={(value) => onChange({ contractType: toggleContract(draft.contractType, value) })}
      />
    </>
  )
}
