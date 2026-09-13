import { APPLICABLE_STATUSES, STATUS_LABELS, type ApplicationStatus } from '@/lib/types'
import { isStatusSelected, type ChoiceOption } from '@/lib/applicationDraft'
import { ChoiceChips } from './ChoiceChips'

const STATUS_OPTIONS: ChoiceOption<ApplicationStatus>[] = APPLICABLE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))

interface StatusPickerProps {
  status: ApplicationStatus
  appliedAt: string
  onStatusChange: (status: ApplicationStatus) => void
  onAppliedAtChange: (appliedAt: string) => void
}

// Statut en puces ; la date de candidature n'apparaît qu'une fois la candidature envoyée.
export function StatusPicker({ status, appliedAt, onStatusChange, onAppliedAtChange }: StatusPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <ChoiceChips
        label="Statut"
        options={STATUS_OPTIONS}
        isSelected={(column) => isStatusSelected(status, column)}
        onSelect={onStatusChange}
      />
      {status !== 'WISHLIST' && (
        <div className="flex items-center gap-3">
          <label htmlFor="application-applied-at" className="text-xs font-medium text-[var(--color-ink-secondary)]">
            Date de candidature
          </label>
          <input
            id="application-applied-at"
            type="date"
            className="input w-auto"
            value={appliedAt}
            onChange={(e) => onAppliedAtChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
