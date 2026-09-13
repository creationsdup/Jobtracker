import { contractOptions, isContractSelected, type ChoiceOption } from './applicationDraft'
import { APPLICABLE_STATUSES, STATUS_LABELS, type Application, type ApplicationStatus } from './types'

/** Les 5 colonnes du tableau, proposées en puces dans le formulaire et la fiche. */
export const STATUS_CHOICES: ChoiceOption<ApplicationStatus>[] = APPLICABLE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))

/** « https://www.jobs.airbus.com/offre/123/ » → « jobs.airbus.com/offre/123 ». */
export function offerLinkLabel(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
}

export function contractLabel(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  return contractOptions(trimmed).find((option) => isContractSelected(trimmed, option.value))?.label ?? trimmed
}

/** Résumé affiché sur le bloc « Plus de détails » replié, ex. « Toulouse · CDI ». */
export function detailsSummary(app: Pick<Application, 'location' | 'contractType'>): string {
  return [app.location?.trim() || null, contractLabel(app.contractType)].filter(Boolean).join(' · ')
}

export function stepCountLabel(count: number): string {
  if (count === 0) return 'Aucune étape'
  return `${count} étape${count > 1 ? 's' : ''}`
}
