import type { Application, ApplicationStatus } from './types'

/** Une candidature « Postulée » sans nouvelle depuis ce nombre de jours est à relancer. */
export const FOLLOW_UP_AFTER_DAYS = 7

const DAY_MS = 86_400_000
const ACTIVE_STATUSES: readonly ApplicationStatus[] = ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST']
const INTERVIEW_STATUSES: readonly ApplicationStatus[] = ['INTERVIEW', 'TECHNICAL_TEST']
const OFFER_STATUSES: readonly ApplicationStatus[] = ['OFFER', 'ACCEPTED']

export interface BoardSummary {
  active: number
  interviews: number
  offers: number
  followUps: number
}

function isFollowUpDue(app: Application, now: number): boolean {
  const since = app.appliedAt ?? app.updatedAt
  if (!since) return false
  return Math.floor((now - new Date(since).getTime()) / DAY_MS) >= FOLLOW_UP_AFTER_DAYS
}

/** Les 4 chiffres en tête du tableau (mêmes définitions que l'Accueil de l'édition full). */
export function computeBoardSummary(applications: readonly Application[], now: number): BoardSummary {
  const summary: BoardSummary = { active: 0, interviews: 0, offers: 0, followUps: 0 }
  for (const app of applications) {
    if (ACTIVE_STATUSES.includes(app.status)) summary.active++
    if (INTERVIEW_STATUSES.includes(app.status)) summary.interviews++
    if (OFFER_STATUSES.includes(app.status)) summary.offers++
    if (app.status === 'APPLIED' && isFollowUpDue(app, now)) summary.followUps++
  }
  return summary
}
