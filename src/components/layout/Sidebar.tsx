import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Briefcase, Target, BookOpen, LogOut, Menu } from 'lucide-react'
import { getInitial } from '@/lib/utils'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'
import { SidebarItem } from './SidebarItem'
import { useProfile } from '@/hooks/useProfile'
import { useTranslation } from '@/lib/i18n/I18nContext'
import type { TranslationKey } from '@/lib/i18n/translations'

interface SidebarProps {
  userId: string
  userEmail: string
  applicationsCount: number
  onLogout: () => void
}

export const NAV_LINKS: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { to: '/',             labelKey: 'sidebar.dashboard',    icon: LayoutDashboard },
  { to: '/applications', labelKey: 'sidebar.applications', icon: Briefcase },
  { to: '/goals',        labelKey: 'sidebar.goals',        icon: Target },
  { to: '/library',      labelKey: 'sidebar.library',      icon: BookOpen },
]

const COLLAPSE_KEY = 'jobtracker-sidebar-collapsed'

export function Sidebar({ userId, userEmail, applicationsCount, onLogout }: SidebarProps) {
  const { profile } = useProfile(userId, userEmail)
  const { t, setLocale } = useTranslation()
  const displayName = profile?.fullName?.trim() || userEmail.split('@')[0]

  // The DB-stored preference (synced across devices) wins over the local guess.
  useEffect(() => {
    if (profile?.language) setLocale(profile.language)
  }, [profile?.language, setLocale])

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch { /* ignore */ }
  }, [collapsed])

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-[width] duration-200 ease-out"
      style={{
        width: collapsed ? '68px' : 'var(--sidebar-w)',
        background: 'linear-gradient(175deg, var(--color-nav-bg) 0%, var(--color-nav-bg-end) 100%)',
      }}
    >
      {/* ── Logo + hamburger ── */}
      <div className={`flex items-center pt-6 pb-5 ${collapsed ? 'flex-col gap-3 px-3' : 'justify-between px-5'}`}>
        <NavLink to="/" className="flex items-center gap-2.5 no-underline overflow-hidden">
          <JobTrackerLogo size={30} />
          {!collapsed && (
            <span className="font-bold text-[15px] text-white tracking-tight whitespace-nowrap" style={{ letterSpacing: '-0.02em' }}>
              JobTracker
            </span>
          )}
        </NavLink>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-[10px] border-0 cursor-pointer transition-colors hover:bg-white/[0.1] flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <Menu size={17} />
        </button>
      </div>

      <div className="mx-5 h-px" style={{ background: 'var(--color-nav-divider)' }} />

      {/* ── Nav ── */}
      <nav className="flex-1 flex flex-col gap-1 px-3.5 pt-5 overflow-y-auto no-scrollbar">
        {NAV_LINKS.map(({ to, labelKey, icon }) => (
          <SidebarItem
            key={to}
            to={to}
            label={t(labelKey)}
            icon={icon}
            end={to === '/'}
            badge={labelKey === 'sidebar.applications' ? applicationsCount : undefined}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── Profile footer ── */}
      <div className="px-3.5 py-4">
        <div className="mx-1.5 mb-3 h-px" style={{ background: 'var(--color-nav-divider)' }} />
        <div className={`flex items-center gap-2.5 px-2 ${collapsed ? 'flex-col' : ''}`}>
          <NavLink
            to="/profile"
            className={`flex items-center gap-2.5 no-underline group ${collapsed ? '' : 'flex-1 min-w-0'}`}
            title={collapsed ? displayName : undefined}
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,0.2)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: 'var(--color-cerulean)' }}
              >
                {getInitial(displayName)}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] font-semibold text-white truncate group-hover:underline">{displayName}</p>
                <p className="text-[11px] text-white/45 truncate">{userEmail}</p>
              </div>
            )}
          </NavLink>
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-8 h-8 rounded-full border-0 cursor-pointer transition-all duration-150 hover:bg-white/[0.1] flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            title={t('sidebar.logout')}
            aria-label={t('sidebar.logout')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
