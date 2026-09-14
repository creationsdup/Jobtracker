import type { ReactNode } from 'react'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'

interface AccessLayoutProps {
  headerAction?: ReactNode
  children: ReactNode
}

export function AccessLayout({ headerAction, children }: AccessLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <JobTrackerLogo size={40} />
          <div className="h-9 w-px bg-[var(--color-border)]" />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-bold text-[var(--color-primary)]">JobTracker</p>
            <p className="truncate text-[12.5px] text-[var(--color-muted)]">Suivi de candidatures, sans inscription</p>
          </div>
        </div>
        {headerAction}
      </header>
      <main className="flex flex-1 justify-center px-5 pb-12 pt-10 sm:pt-20">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="px-5 pt-2 text-[13px]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <LegalLinks className="justify-center" />
      </footer>
    </div>
  )
}
