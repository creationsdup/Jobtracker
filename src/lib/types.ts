export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'

export type StepStatus = 'done' | 'current' | 'upcoming'

export type StepType =
  | 'applied'
  | 'confirmation'
  | 'interview_hr'
  | 'interview_manager'
  | 'test'
  | 'offer'
  | 'rejected'
  | 'custom'

export interface Application {
  id: string
  company: string
  role: string
  location: string
  contract_type: string
  salary: string
  status: ApplicationStatus
  url: string
  description: string
  created_at: string
  updated_at: string
}

export interface TimelineStep {
  id: string
  application_id: string
  title: string
  step_type: StepType
  date: string
  time: string
  status: StepStatus
  notes: string
  created_at: string
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Sauvegardée',
  applied: 'Postulée',
  interview: 'Entretien',
  offer: 'Offre reçue',
  rejected: 'Refusée',
}

export const STEP_LABELS: Record<StepType, string> = {
  applied: 'Candidature envoyée',
  confirmation: 'Accusé de réception',
  interview_hr: 'Entretien RH',
  interview_manager: 'Entretien manager',
  test: 'Test / Cas pratique',
  offer: 'Offre reçue',
  rejected: 'Refus',
  custom: 'Étape libre',
}

export const STEP_TO_STATUS: Partial<Record<StepType, ApplicationStatus>> = {
  applied: 'applied',
  confirmation: 'applied',
  interview_hr: 'interview',
  interview_manager: 'interview',
  test: 'interview',
  offer: 'offer',
  rejected: 'rejected',
}
