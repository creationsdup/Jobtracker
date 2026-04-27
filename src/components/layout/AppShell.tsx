import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/store/uiStore'

interface AppShellProps {
  userEmail: string
  applicationsCount: number
  onLogout: () => void
  onAddApplication: () => void
}

const PAGE_TITLES: Record<string, string> = {
  '/applications': 'Candidatures',
  '/kanban': 'Kanban',
  '/library': 'Bibliothèque',
}

export function AppShell({ userEmail, applicationsCount, onLogout, onAddApplication }: AppShellProps) {
  const { toggleSidebar } = useUIStore()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const title = PAGE_TITLES[location.pathname]

  return (
    <div className="min-h-screen">
      <Sidebar
        userEmail={userEmail}
        applicationsCount={applicationsCount}
        onLogout={onLogout}
      />

      <div
        className="md:ml-[var(--sidebar-w)] min-h-screen flex flex-col pb-14 md:pb-0"
        style={{ background: 'var(--color-content-bg)' }}
      >
        {!isDashboard && (
          <header
            className="sticky top-0 px-6 py-3.5 flex items-center gap-4 z-30"
            style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
          >
            <button className="md:hidden btn btn-ghost p-1.5" onClick={toggleSidebar}>
              <Menu size={20} />
            </button>
            <h2 className="flex-1 text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h2>
            <button className="btn btn-primary btn-sm" onClick={onAddApplication}>
              + Nouvelle candidature
            </button>
          </header>
        )}

        <main className={isDashboard ? 'flex-1' : 'flex-1 p-6'}>
          <Outlet context={{ onAddApplication }} />
        </main>
      </div>
    </div>
  )
}
