export type StatusKey = 'saved' | 'wishlist' | 'applied' | 'interview' | 'offer' | 'refused' | 'rejected'

export const STATUS_LABELS: Record<StatusKey, string> = {
  saved:     'Sauvegardée',
  wishlist:  'Sauvegardée',
  applied:   'Postulée',
  interview: 'Entretien',
  offer:     'Offre',
  refused:   'Refusée',
  rejected:  'Refusée',
}

export interface StatusColor {
  bg: string
  text: string
  accent: string
}

export const STATUS_COLORS: Record<StatusKey, StatusColor> = {
  saved:     { bg: '#F3F4F6', text: '#374151', accent: '#9CA3AF' },
  wishlist:  { bg: '#F3F4F6', text: '#374151', accent: '#9CA3AF' },
  applied:   { bg: '#E0F4FB', text: '#003459', accent: '#007EA7' },
  interview: { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' },
  offer:     { bg: '#D1FAE5', text: '#065F46', accent: '#059669' },
  refused:   { bg: '#FEE2E2', text: '#991B1B', accent: '#DC2626' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B', accent: '#DC2626' },
}

// ─── Match Level Colors ──────────────────────────────────────────────────────

import type { MatchLevel } from '@/types/jobMatching'

export interface MatchLevelColor {
  fg: string
  bg: string
}

// Single source for the 5-tier match-level color ramp, used by MatchScoreBadge and MatchDetailsModal.
export function matchLevelColor(level: MatchLevel): MatchLevelColor {
  switch (level) {
    case 'Très cohérent':  return { fg: '#059669', bg: '#d1fae5' }
    case 'Cohérent':       return { fg: '#0284c7', bg: '#e0f2fe' }
    case 'Moyen':          return { fg: '#d97706', bg: '#fef3c7' }
    case 'Peu cohérent':   return { fg: '#ea580c', bg: '#ffedd5' }
    case 'Hors cible':     return { fg: '#dc2626', bg: '#fee2e2' }
  }
}
