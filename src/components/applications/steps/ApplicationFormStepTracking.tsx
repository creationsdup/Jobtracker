import type { ApplicationFormData } from './ApplicationFormStepOffer'
import type { ApplicationStatus } from '@/lib/types'
import { APPLICABLE_STATUSES, STATUS_LABELS } from '@/lib/types'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = APPLICABLE_STATUSES.map(
  (value) => ({ value, label: STATUS_LABELS[value] }),
)

interface ApplicationFormStepTrackingProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
}

export function ApplicationFormStepTracking({ value, onChange }: ApplicationFormStepTrackingProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">Statut</label>
        <select
          className="input text-sm py-2"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as ApplicationStatus })}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">Date de candidature</label>
        <input
          className="input text-sm py-2"
          type="date"
          value={value.appliedAt}
          onChange={(e) => onChange({ appliedAt: e.target.value })}
        />
      </div>
    </div>
  )
}
