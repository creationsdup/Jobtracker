import { guessCompanyWebsiteFromJobUrl } from './jobBoards'
import type { Application, ApplicationStatus } from './types'

export type ApplicationPayload = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>

/** Ce que l'utilisateur est en train de saisir dans le formulaire « Nouvelle candidature ». */
export interface ApplicationDraft {
  company: string
  position: string
  jobUrl: string
  companyWebsite: string
  status: ApplicationStatus
  /** Jour au format AAAA-MM-JJ (valeur d'un <input type="date">), ou vide. */
  appliedAt: string
  location: string
  contractType: string
  notes: string
}

export interface ChoiceOption<T extends string = string> {
  value: T
  label: string
}

// WHY: mêmes valeurs que l'ancien <select> — les candidatures déjà en base les utilisent.
const STANDARD_CONTRACTS: ChoiceOption[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'ALTERNANCE', label: 'Alternance' },
  { value: 'CDI-Graduate Program', label: 'CDI-Graduate Program' },
]

// WHY: le formulaire ne propose que les 5 colonnes du tableau ; une candidature restée sur un
// ancien statut doit quand même allumer la puce de sa colonne.
const STATUS_COLUMN: Record<ApplicationStatus, ApplicationStatus> = {
  WISHLIST: 'WISHLIST',
  APPLIED: 'APPLIED',
  PHONE_SCREEN: 'APPLIED',
  INTERVIEW: 'INTERVIEW',
  TECHNICAL_TEST: 'INTERVIEW',
  OFFER: 'OFFER',
  ACCEPTED: 'OFFER',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'REJECTED',
}

export function createDraft(source?: Partial<ApplicationPayload> | null, companyWebsite?: string | null): ApplicationDraft {
  return {
    company: source?.company ?? '',
    position: source?.position ?? '',
    jobUrl: source?.jobUrl ?? '',
    companyWebsite: companyWebsite ?? '',
    status: source?.status ?? 'WISHLIST',
    appliedAt: source?.appliedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '',
    location: source?.location ?? '',
    contractType: source?.contractType ?? '',
    notes: source?.notes ?? '',
  }
}

export function canSaveDraft(draft: ApplicationDraft): boolean {
  return draft.company.trim().length > 0 && draft.position.trim().length > 0
}

/** Applique une saisie et, tant qu'aucun site n'est renseigné, le déduit du lien ou de l'entreprise. */
export function patchDraft(
  prev: ApplicationDraft,
  patch: Partial<ApplicationDraft>,
  lookupCompanyDomain: (company: string) => string | undefined,
): ApplicationDraft {
  const next = { ...prev, ...patch }
  if (patch.jobUrl !== undefined && !prev.companyWebsite.trim()) {
    const guessed = guessCompanyWebsiteFromJobUrl(patch.jobUrl)
    if (guessed) next.companyWebsite = guessed
  }
  if (patch.company !== undefined && !prev.companyWebsite.trim()) {
    const known = lookupCompanyDomain(patch.company.trim())
    if (known) next.companyWebsite = known
  }
  return next
}

/** Change le statut ; une candidature envoyée sans date prend la date du jour. */
export function withStatus(draft: ApplicationDraft, status: ApplicationStatus, today: string): ApplicationDraft {
  const needsDate = status !== 'WISHLIST' && !draft.appliedAt
  return { ...draft, status, appliedAt: needsDate ? today : draft.appliedAt }
}

export function isStatusSelected(current: ApplicationStatus, column: ApplicationStatus): boolean {
  return STATUS_COLUMN[current] === column
}

/** Les contrats standards, plus la valeur d'origine si elle n'en fait pas partie (saisie libre ancienne). */
export function contractOptions(original: string): ChoiceOption[] {
  const value = original.trim()
  if (!value || STANDARD_CONTRACTS.some((option) => isContractSelected(value, option.value))) {
    return STANDARD_CONTRACTS
  }
  return [...STANDARD_CONTRACTS, { value, label: value }]
}

export function isContractSelected(current: string, value: string): boolean {
  const selected = current.trim().toLowerCase()
  return selected.length > 0 && selected === value.trim().toLowerCase()
}

export function toggleContract(current: string, value: string): string {
  return isContractSelected(current, value) ? '' : value
}

/** Les sections repliables s'ouvrent seules quand elles contiennent déjà quelque chose. */
export function initialSections(draft: ApplicationDraft): { details: boolean; notes: boolean } {
  return {
    // WHY: le site de l'entreprise est déduit automatiquement, il ne justifie pas d'ouvrir la section.
    details: draft.location.trim().length > 0 || draft.contractType.trim().length > 0,
    notes: draft.notes.trim().length > 0,
  }
}

export function toPayload(draft: ApplicationDraft, userId: string): ApplicationPayload {
  return {
    userId,
    company: draft.company.trim(),
    position: draft.position.trim(),
    location: orNull(draft.location),
    contractType: orNull(draft.contractType),
    jobUrl: orNull(draft.jobUrl),
    status: draft.status,
    notes: orNull(draft.notes),
    appliedAt: draft.status === 'WISHLIST' ? null : draft.appliedAt || null,
  }
}

export function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
