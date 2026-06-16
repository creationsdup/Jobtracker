import type { ApplicationFormData } from './ApplicationFormStepOffer'

interface ApplicationFormStepNotesProps {
  value: ApplicationFormData
  onChange: (patch: Partial<ApplicationFormData>) => void
}

export function ApplicationFormStepNotes({ value, onChange }: ApplicationFormStepNotesProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Notes</label>
      <textarea
        className="input resize-y text-base py-2.5"
        rows={8}
        value={value.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Notes sur la candidature..."
      />
    </div>
  )
}
