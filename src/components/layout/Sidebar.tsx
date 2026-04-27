import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Columns3, BookOpen, X } from 'lucide-react'
import { cn, getInitial } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

interface SidebarProps {
  userName: string
  onLogout: () => void
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Candidatures', icon: Briefcase },
  { to: '/kanban', label: 'Kanban', icon: Columns3 },
  { to: '/library', label: 'Bibliothèque', icon: BookOpen },
]

export function Sidebar({ userName, onLogout }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-[var(--sidebar-w)] bg-[var(--color-surface)] border-r border-[var(--color-border)]',
          'flex flex-col z-50 transition-transform duration-250 ease-in-out',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--color-border)] font-bold text-base">
          <span className="text-2xl">💼</span>
          <span className="flex-1">JobTracker</span>
          <button
            className="md:hidden btn btn-ghost p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium no-underline transition-colors duration-150',
                  isActive
                    ? 'bg-blue-100 text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)]',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {getInitial(userName)}
            </div>
            <span className="font-medium text-sm truncate">{userName}</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-3 py-1.5 text-xs text-[var(--color-muted)] border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]"
          >
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
