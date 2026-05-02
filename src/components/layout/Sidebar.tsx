import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, BookOpen,
  FileText, Target, X,
} from 'lucide-react'
import { cn, getInitial } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'
import { useProfile } from '@/hooks/useProfile'

interface SidebarProps {
  userId: string
  userEmail: string
  applicationsCount: number
  onLogout: () => void
}

const MAIN_NAV = [
  { to: '/',             label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/applications', label: 'Candidatures',    icon: Briefcase },
  { to: '/goals',        label: 'Objectifs',       icon: Target },
  { to: '/library',      label: 'Expériences',     icon: BookOpen },
  { to: '/resumes',      label: 'CV Builder',      icon: FileText },
]

export function Sidebar({ userId, userEmail, applicationsCount, onLogout }: SidebarProps) {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed } = useUIStore()
  const { profile } = useProfile(userId, userEmail)
  const displayName = profile?.fullName?.trim() || userEmail.split('@')[0]
  const avatarLabel = profile?.fullName?.trim() || userEmail

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-[var(--sidebar-w)] flex flex-col z-50 overflow-hidden',
          'transition-transform duration-250 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0',
        )}
        style={{ background: 'linear-gradient(160deg, #6c3de0 0%, #4f46e5 50%, #312e81 100%)' }}
      >
        <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-12 bottom-24 h-36 w-36 rounded-full bg-white/8" />
        <div className="pointer-events-none absolute right-5 bottom-40 h-16 w-16 rounded-full bg-white/12" />

        {/* Header */}
        <div className="relative px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <JobTrackerLogo size={44} />
              <span className="text-white font-bold text-base tracking-tight">JobTracker</span>
            </div>
            <button className="md:hidden p-1 text-white/50 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Gérez vos candidatures
          </p>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">

          {/* Principal */}
          <div className="flex flex-col gap-0.5">
            <p className="shell-section-title px-2 mb-1">
              Principal
            </p>
            {MAIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium no-underline transition-colors duration-100 relative rounded-[14px]',
                    isActive
                      ? 'text-white'
                      : 'hover:text-white/85',
                  )
                }
                style={({ isActive }) => isActive
                  ? {
                      background: 'rgba(255,255,255,0.13)',
                      color: 'white',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)',
                    }
                  : { color: 'rgba(255,255,255,0.68)' }
                }
              >
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {label === 'Candidatures' && applicationsCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--color-violet-accent)', color: 'white' }}
                  >
                    {applicationsCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="relative px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 mb-2.5 rounded-[18px] px-2.5 py-2.5 no-underline transition-colors',
                isActive ? 'text-white' : 'text-white/75 hover:text-white',
              )
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.06)',
              boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            })}
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={avatarLabel}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/20"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {getInitial(displayName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{displayName}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{userEmail}</p>
            </div>
          </NavLink>
          <button
            onClick={onLogout}
            className="w-full px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border-0 cursor-pointer transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <button
        className="hidden md:flex fixed top-6 z-[60] h-10 w-3 items-center justify-center rounded-r-full border-l-0 text-white transition-[left,background-color,box-shadow,transform] duration-250 ease-in-out hover:translate-x-[1px]"
        style={{
          left: sidebarCollapsed ? 0 : 'var(--sidebar-w)',
          background: sidebarCollapsed ? 'rgba(79,70,229,0.72)' : 'rgba(49,46,129,0.72)',
          borderColor: 'rgba(255,255,255,0.18)',
          boxShadow: '0 8px 18px rgba(30,25,102,0.14)',
          backdropFilter: 'blur(10px)',
        }}
        onClick={toggleSidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Afficher la colonne de gauche' : 'Masquer la colonne de gauche'}
      >
        <span className="h-6 w-px bg-white/50" />
      </button>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
        style={{ background: 'var(--color-sidebar)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        {MAIN_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 no-underline"
            style={({ isActive }) => ({ color: isActive ? 'white' : 'rgba(255,255,255,0.45)' })}
          >
            <Icon size={18} />
            <span style={{ fontSize: 9 }}>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <NavLink
          to="/profile"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 no-underline"
          style={({ isActive }) => ({ color: isActive ? 'white' : 'rgba(255,255,255,0.45)' })}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={avatarLabel}
              className="w-[18px] h-[18px] rounded-full object-cover border border-white/20"
            />
          ) : (
            <div
              className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'var(--color-violet-accent)' }}
            >
              {getInitial(displayName)}
            </div>
          )}
          <span style={{ fontSize: 9 }}>Profil</span>
        </NavLink>
      </nav>
    </>
  )
}
