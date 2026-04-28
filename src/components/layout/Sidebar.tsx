import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, BookOpen,
  FileText, Upload, FileSearch, Mail, X,
} from 'lucide-react'
import { cn, getInitial } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'

interface SidebarProps {
  userEmail: string
  applicationsCount: number
  onLogout: () => void
}

const MAIN_NAV = [
  { to: '/',             label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/applications', label: 'Candidatures',    icon: Briefcase },
  { to: '/library',      label: 'Expériences',     icon: BookOpen },
]

const DISABLED_NAV = [
  { label: 'CV Builder',       icon: FileText,   badge: 'Bientôt' },
]

const TOOLS_NAV = [
  { label: "Import d'offre",   icon: Upload },
  { label: 'Import CV / PDF',  icon: FileSearch },
  { label: 'Génération lettre', icon: Mail },
]

export function Sidebar({ userEmail, applicationsCount, onLogout }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

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
          'fixed top-0 left-0 h-screen w-[var(--sidebar-w)] flex flex-col z-50',
          'transition-transform duration-250 ease-in-out md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--color-sidebar)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">

          {/* Principal */}
          <div className="flex flex-col gap-0.5">
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
                    'flex items-center gap-2.5 px-3 py-2 text-sm font-medium no-underline transition-colors duration-100 relative',
                    isActive
                      ? 'text-white'
                      : 'hover:text-white/85',
                  )
                }
                style={({ isActive }) => isActive
                  ? {
                      background: 'rgba(127,119,221,0.20)',
                      color: 'white',
                      borderLeft: '2px solid var(--color-violet-accent)',
                      paddingLeft: 10,
                    }
                  : { color: 'rgba(255,255,255,0.55)' }
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

            {DISABLED_NAV.map(({ label, icon: Icon, badge }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium opacity-40 cursor-not-allowed select-none"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Outils */}
          <div className="flex flex-col gap-0.5">
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Outils
            </p>
            {TOOLS_NAV.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium opacity-40 cursor-not-allowed select-none"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
              style={{ background: 'var(--color-violet-accent)' }}
            >
              {getInitial(userEmail)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{userEmail.split('@')[0]}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{userEmail}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border-0 cursor-pointer transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

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
      </nav>
    </>
  )
}
