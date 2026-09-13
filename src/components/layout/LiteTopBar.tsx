import { NavLink } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { cn } from '@/lib/utils'

interface LiteTopBarProps {
  onAddApplication: () => void
}

export function LiteTopBar({ onAddApplication }: LiteTopBarProps) {
  const { t } = useTranslation()

  return (
    <header
      className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-14 items-center gap-3 px-4 md:px-8">
        <NavLink to="/" end className="flex items-center gap-2.5 no-underline" aria-label="Retour au tableau">
          <JobTrackerLogo size={28} />
          <span className="font-bold text-[15px] text-[var(--color-primary)]" style={{ letterSpacing: '-0.02em' }}>
            JobTracker
          </span>
        </NavLink>

        <div className="flex-1" />

        {/* WHY: sur téléphone, c'est le bouton rond flottant de LiteShell qui ouvre le formulaire. */}
        <button className="btn btn-primary btn-sm hidden md:inline-flex gap-1.5" onClick={onAddApplication}>
          <Plus size={15} />
          Nouvelle candidature
        </button>

        <NavLink
          to="/mon-tableau"
          aria-label={t('sidebar.myBoard')}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium no-underline transition-colors hover:bg-[var(--color-bg)]',
              isActive ? 'bg-[var(--color-bg)] text-[var(--color-primary)]' : 'text-[var(--color-muted)]',
            )
          }
        >
          <Settings size={16} />
          <span className="hidden sm:inline">{t('sidebar.myBoard')}</span>
        </NavLink>
      </div>
    </header>
  )
}
