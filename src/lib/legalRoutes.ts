export type LegalPageId = 'terms' | 'privacy' | 'contact'

export interface LegalPageLink {
  id: LegalPageId
  path: string
  label: string
}

// Ordre d'affichage dans les pieds de page.
export const LEGAL_PAGES: readonly LegalPageLink[] = [
  { id: 'privacy', path: '/confidentialite', label: 'Confidentialité' },
  { id: 'terms', path: '/cgu', label: 'CGU' },
  { id: 'contact', path: '/contact', label: 'Contact' },
]

export function legalPageFromPath(pathname: string): LegalPageId | null {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '')
  return LEGAL_PAGES.find((page) => page.path === normalized)?.id ?? null
}
