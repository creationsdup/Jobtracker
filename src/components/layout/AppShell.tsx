import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/store/uiStore'

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
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
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
