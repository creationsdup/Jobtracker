import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from './Sidebar'
import { useTranslation } from '@/lib/i18n/I18nContext'

export function MobileBottomNav() {
  const { t } = useTranslation()
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 grid"
      style={{
        gridTemplateColumns: `repeat(${NAV_LINKS.length}, minmax(0, 1fr))`,
        background: 'var(--color-primary)',
        borderTop: '1px solid rgba(0, 126, 167, 0.2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 no-underline transition-colors duration-150',
              isActive ? 'text-white' : 'text-white/60',
            )
          }
        >
          <Icon size={18} />
          <span className="text-[9px] font-medium leading-none">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
