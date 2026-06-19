// ─── Application ────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'WISHLIST'
  | 'APPLIED'
  | 'PHONE_SCREEN'
  | 'INTERVIEW'
  | 'TECHNICAL_TEST'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export interface Application {
  id: string
  userId: string
  company: string
  position: string
  location: string | null
  jobUrl: string | null
  status: ApplicationStatus
  contractType: string | null
  notes: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export type StepStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface TimelineStep {
  id: string
  applicationId: string
  title: string
  date: string
  time: string | null
  notes: string | null
  status: StepStatus
  order: number
  createdAt: string
}

// ─── Experience ──────────────────────────────────────────────────────────────

export type ExperienceType = 'WORK' | 'VOLUNTEER' | 'EDUCATION' | 'PROJECT' | 'OTHER'

export interface Experience {
  id: string
  userId: string
  type: ExperienceType
  title: string
  organization: string
  location: string | null
  startDate: string
  endDate: string | null
  current: boolean
  description: string | null
  skills: string[]
  subsection: string | null
  createdAt: string
}

// ─── User Goals ──────────────────────────────────────────────────────────────

export interface UserGoal {
  id: string
  user_id: string
  type: string | null
  target_positions: string[]
  contract_types: string[]
  target_date: string | null
  personal_target: number | null
  zones: string[]
  target_companies: string[]
  created_at: string
  updated_at: string
}

// ─── JobOffer ────────────────────────────────────────────────────────────────

export interface JobOffer {
  id: string
  title: string
  company: string
  location: string | null
  description: string | null
  url: string | null
  createdAt: string
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: 'À postuler',
  APPLIED: 'Postulée',
  PHONE_SCREEN: 'Pré-sélection',
  INTERVIEW: 'Entretien',
  TECHNICAL_TEST: 'Test technique',
  OFFER: 'Offre reçue',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Abandonnée',
}

export const KANBAN_COLUMNS: ApplicationStatus[] = [
  'WISHLIST',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
]

// WHY: the Postgres "ApplicationStatus" enum only has 5 values (SAVED/APPLIED/INTERVIEW/OFFER/REJECTED).
// PHONE_SCREEN, TECHNICAL_TEST, ACCEPTED and WITHDRAWN are collapsed to one of these on save
// (see lib/applicationStatus.ts), so offering them in filters/selects is misleading — use this
// list anywhere a user picks or filters by status.
export const APPLICABLE_STATUSES: ApplicationStatus[] = KANBAN_COLUMNS
