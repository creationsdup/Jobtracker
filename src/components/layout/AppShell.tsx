import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/store/uiStore'

const TODAY = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/applications': 'Candidatures',
  '/kanban': 'Kanban',
  '/library': 'Bibliothèque',
}

interface AppShellProps {
  userName: string
  onLogout: () => void
  onAddApplication: () => void
}

export function AppShell({ userName, onLogout, onAddApplication }: AppShellProps) {
  const { toggleSidebar } = useUIStore()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'JobTracker'

  return (
    <div className="min-h-screen">
      <Sidebar userName={userName} onLogout={onLogout} />

      <div className="md:ml-[var(--sidebar-w)] min-h-screen flex flex-col">
        <header className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-3.5 flex items-center gap-4 z-30">
          <button
            className="md:hidden btn btn-ghost p-1.5"
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            {location.pathname === '/' && (
              <p className="text-[var(--color-muted)] capitalize" style={{ fontSize: 12 }}>{TODAY}</p>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={onAddApplication}>
            <Plus size={14} />
            Nouvelle candidature
          </button>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
