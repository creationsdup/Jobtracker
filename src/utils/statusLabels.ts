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

// Backed by the .badge-* classes / --color-status-* vars in index.css — the
// single source of truth for status colors, so palette changes only happen there.
export const STATUS_BADGE_CLASS: Record<StatusKey, string> = {
  saved:     'badge-saved',
  wishlist:  'badge-saved',
  applied:   'badge-applied',
  interview: 'badge-interview',
  offer:     'badge-offer',
  refused:   'badge-rejected',
  rejected:  'badge-rejected',
}

export interface ScoreTierColor {
  fg: string
  bg: string
}

// Single source for the good/medium/poor score ramp (goal alignment %, match score, etc.)
export function scoreTierColor(score: number): ScoreTierColor {
  if (score >= 75) return { fg: '#059669', bg: '#d1fae5' }
  if (score >= 40) return { fg: '#d97706', bg: '#fef3c7' }
  return { fg: '#dc2626', bg: '#fee2e2' }
}
