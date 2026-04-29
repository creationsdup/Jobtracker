import type { ApplicationStatus, StepStatus, TimelineStep } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

export interface TimelinePreset {
  icon: string
  title: string
  subtitle: string
  stepStatus: StepStatus
  nextStatus?: ApplicationStatus
}

export const TIMELINE_PRESETS: TimelinePreset[] = [
  { icon: '📤', title: 'Candidature envoyée', subtitle: `Statut: ${STATUS_LABELS.APPLIED}`, stepStatus: 'COMPLETED', nextStatus: 'APPLIED' },
  { icon: '📩', title: 'Accusé de réception', subtitle: `Statut: ${STATUS_LABELS.PHONE_SCREEN}`, stepStatus: 'COMPLETED', nextStatus: 'PHONE_SCREEN' },
  { icon: '🎙️', title: 'Entretien RH', subtitle: `Statut: ${STATUS_LABELS.INTERVIEW}`, stepStatus: 'COMPLETED', nextStatus: 'INTERVIEW' },
  { icon: '🧑‍💼', title: 'Entretien manager', subtitle: `Statut: ${STATUS_LABELS.INTERVIEW}`, stepStatus: 'COMPLETED', nextStatus: 'INTERVIEW' },
  { icon: '📋', title: 'Test / cas pratique', subtitle: `Statut: ${STATUS_LABELS.TECHNICAL_TEST}`, stepStatus: 'COMPLETED', nextStatus: 'TECHNICAL_TEST' },
  { icon: '✅', title: 'Offre reçue', subtitle: `Statut: ${STATUS_LABELS.OFFER}`, stepStatus: 'COMPLETED', nextStatus: 'OFFER' },
  { icon: '❌', title: 'Refus', subtitle: `Statut: ${STATUS_LABELS.REJECTED}`, stepStatus: 'COMPLETED', nextStatus: 'REJECTED' },
  { icon: '✏️', title: 'Étape libre', subtitle: 'Personnaliser cette étape', stepStatus: 'UPCOMING' },
]

const STEP_STATUS_MATCHERS: Array<{ status: ApplicationStatus; patterns: string[] }> = [
  { status: 'WITHDRAWN', patterns: ['abandon', 'retire', 'retirée', 'retiree', 'withdrawn'] },
  { status: 'REJECTED', patterns: ['refus', 'rejet', 'rejete', 'rejetee', 'rejeté', 'rejetée'] },
  { status: 'ACCEPTED', patterns: ['acceptee', 'acceptée', 'offre acceptee', 'offre acceptée', 'signee', 'signée'] },
  { status: 'OFFER', patterns: ['offre recue', 'offre reçue', 'offre', 'proposition'] },
  { status: 'TECHNICAL_TEST', patterns: ['test', 'cas pratique', 'exercice', 'technical'] },
  { status: 'INTERVIEW', patterns: ['entretien', 'interview', 'manager', 'rh', 'recruteur'] },
  { status: 'PHONE_SCREEN', patterns: ['accuse de reception', 'accusé de réception', 'preselection', 'préselection', 'pré-sélection', 'pre-selection', 'screening'] },
  { status: 'APPLIED', patterns: ['candidature envoyee', 'candidature envoyée', 'postulee', 'postulée', 'application sent'] },
]

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function inferApplicationStatusFromStep(step: Pick<TimelineStep, 'title' | 'status'>): ApplicationStatus | null {
  if (step.status === 'CANCELLED') return null
  const normalizedTitle = normalizeText(step.title)
  if (!normalizedTitle) return null

  for (const matcher of STEP_STATUS_MATCHERS) {
    if (matcher.patterns.some((pattern) => normalizedTitle.includes(normalizeText(pattern)))) {
      return matcher.status
    }
  }

  return null
}

export function deriveApplicationStatusFromSteps(steps: TimelineStep[]): ApplicationStatus | null {
  const sortedSteps = [...steps].sort((a, b) => {
    const dateSort = a.date.localeCompare(b.date)
    if (dateSort !== 0) return dateSort
    const timeSort = (a.time ?? '').localeCompare(b.time ?? '')
    if (timeSort !== 0) return timeSort
    return a.order - b.order
  })

  for (let index = sortedSteps.length - 1; index >= 0; index -= 1) {
    const status = inferApplicationStatusFromStep(sortedSteps[index])
    if (status) return status
  }

  return null
}
