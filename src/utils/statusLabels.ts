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
  saved:     { bg: '#EEEDFE', text: '#3C3489', accent: '#7F77DD' },
  wishlist:  { bg: '#EEEDFE', text: '#3C3489', accent: '#7F77DD' },
  applied:   { bg: '#EEEDFE', text: '#534AB7', accent: '#534AB7' },
  interview: { bg: '#FAEEDA', text: '#633806', accent: '#EF9F27' },
  offer:     { bg: '#E1F5EE', text: '#085041', accent: '#1D9E75' },
  refused:   { bg: '#FAECE7', text: '#712B13', accent: '#D85A30' },
  rejected:  { bg: '#FAECE7', text: '#712B13', accent: '#D85A30' },
}
