import { deriveApplicationStatusFromSteps } from './timelineStatus'
import type { ApplicationStatus, TimelineStep } from './types'

/** Ajoute à la timeline les étapes pas encore confirmées par Supabase, triées par date comme useSteps. */
export function mergePendingSteps(steps: TimelineStep[], pending: TimelineStep[]): TimelineStep[] {
  const waiting = pending.filter((candidate) => !steps.some((step) => step.id === candidate.id))
  if (waiting.length === 0) return steps
  return [...steps, ...waiting].sort((a, b) => a.date.localeCompare(b.date))
}

/** Statut que la candidature doit prendre après un changement de timeline, ou null s'il ne change pas. */
export function resolveStatusChange(
  current: ApplicationStatus,
  nextSteps: TimelineStep[],
  explicitStatus?: ApplicationStatus | '',
): ApplicationStatus | null {
  const target = explicitStatus || deriveApplicationStatusFromSteps(nextSteps) || (nextSteps.length === 0 ? 'WISHLIST' : null)
  return target && target !== current ? target : null
}
