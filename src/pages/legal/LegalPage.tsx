import type { LegalPageId } from '@/lib/legalRoutes'
import { ContactPage } from './ContactPage'
import { PrivacyPage } from './PrivacyPage'
import { TermsPage } from './TermsPage'

interface LegalPageProps {
  page: LegalPageId
}

export function LegalPage({ page }: LegalPageProps) {
  if (page === 'terms') return <TermsPage />
  if (page === 'privacy') return <PrivacyPage />
  return <ContactPage />
}
