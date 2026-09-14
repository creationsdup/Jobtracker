import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Eyebrow, Title } from '@/components/access/accessUi'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'
import type { LegalPageId } from '@/lib/legalRoutes'
import { LegalLinks } from './LegalLinks'

interface LegalLayoutProps {
  page: LegalPageId
  eyebrow: string
  title: string
  updatedOn?: string
  lead?: ReactNode
  children: ReactNode
}

export function LegalLayout({ page, eyebrow, title, updatedOn, lead, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${title} · JobTracker`
  }, [title])

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-9">
        <a href="/" className="flex min-w-0 items-center gap-2.5 no-underline">
          <JobTrackerLogo size={32} />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-[var(--color-primary)]">JobTracker</span>
        </a>
        <a href="/" className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-[var(--color-accent)] no-underline hover:underline">
          <ArrowLeft size={16} />
          Retour à l'app
        </a>
      </header>

      <main className="flex flex-1 justify-center px-5 pb-16 pt-10 sm:pt-14">
        <article className="w-full max-w-[720px]">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Title>{title}</Title>
          {updatedOn && <p className="text-[13px] text-[var(--color-muted)]">Mise à jour le {updatedOn}</p>}
          {lead && <div className="mt-5 text-[16px] leading-relaxed text-[var(--color-ink-secondary)]">{lead}</div>}
          <div className="mt-10">{children}</div>
        </article>
      </main>

      <footer
        className="border-t border-[var(--color-border)] px-5 pt-5 text-[13px]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <LegalLinks current={page} className="justify-center" />
      </footer>
    </div>
  )
}
