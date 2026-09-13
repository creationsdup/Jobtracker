import { calculateJobMatch, applicationToJobMatchInput } from './jobMatching'
import { APPLICABLE_STATUSES, STATUS_LABELS, type Application, type ApplicationStatus, type UserGoal } from './types'

export type SortMode = 'date_desc' | 'date_asc' | 'position_asc' | 'company_asc' | 'match_desc'

export interface ApplicationFilters {
  search: string
  status: ApplicationStatus | ''
  contract: string
  sort: SortMode
}

export const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  ...APPLICABLE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
]

const BASE_SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'date_desc', label: 'Plus récentes' },
  { value: 'date_asc', label: 'Plus anciennes' },
  { value: 'position_asc', label: 'Poste (A-Z)' },
  { value: 'company_asc', label: 'Entreprise (A-Z)' },
]

/** Le tri « Meilleur match » n'a de sens qu'avec la page Objectifs (édition full). */
export function sortOptions(withMatch: boolean): { value: SortMode; label: string }[] {
  return withMatch ? [...BASE_SORT_OPTIONS, { value: 'match_desc', label: 'Meilleur match' }] : BASE_SORT_OPTIONS
}

function sortDate(app: Application): number {
  return new Date(app.appliedAt ?? app.createdAt).getTime()
}

export function filterAndSortApplications(
  applications: readonly Application[],
  filters: ApplicationFilters,
  goal?: UserGoal | null,
): Application[] {
  const q = filters.search.toLowerCase()
  const result = applications
    .filter((a) => !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q))
    .filter((a) => !filters.status || a.status === filters.status)
    .filter((a) => !filters.contract || a.contractType === filters.contract)

  return result.sort((a, b) => {
    switch (filters.sort) {
      case 'date_asc':
        return sortDate(a) - sortDate(b)
      case 'position_asc':
        return a.position.localeCompare(b.position)
      case 'company_asc':
        return a.company.localeCompare(b.company)
      case 'match_desc': {
        const scoreOf = (app: Application) => goal ? calculateJobMatch(applicationToJobMatchInput(app), goal).totalScore : -1
        return scoreOf(b) - scoreOf(a)
      }
      case 'date_desc':
      default:
        return sortDate(b) - sortDate(a)
    }
  })
}
