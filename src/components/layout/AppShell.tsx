import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/store/uiStore'

interface AppShellProps {
  userId: string
  userEmail: string
  applicationsCount: number
  onLogout: () => void
  onAddApplication: () => void
}

const PAGE_META: Record<string, { title: string; subtitle: string; showAdd?: boolean }> = {
  '/applications': { title: 'Candidatures',  subtitle: 'Gérez et suivez vos candidatures',         showAdd: true },
  '/kanban':       { title: 'Kanban',         subtitle: 'Vue pipeline par statut',                   showAdd: true },
  '/library':      { title: 'Bibliothèque',   subtitle: 'Expériences, formations et compétences' },
  '/profile':      { title: 'Profil',         subtitle: 'Informations personnelles et coordonnées' },
  '/resumes':      { title: 'CV Builder',     subtitle: 'Créez et exportez vos CV sur-mesure' },
  '/goals':        { title: 'Objectifs',      subtitle: 'Définissez vos cibles et suivez vos progrès' },
}

export function AppShell({ userId, userEmail, applicationsCount, onLogout, onAddApplication }: AppShellProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const meta = PAGE_META[location.pathname]

  return (
    <div className="min-h-screen shell-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70">
        <div className="absolute left-[14%] top-[-4.5rem] h-40 w-40 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute right-[8%] top-10 h-52 w-52 rounded-full bg-[var(--color-shell-orb-primary)] blur-3xl" />
      </div>

      <Sidebar
        userId={userId}
        userEmail={userEmail}
        applicationsCount={applicationsCount}
        onLogout={onLogout}
      />

      <div
        className="min-h-screen flex flex-col pb-14 md:pb-0 relative transition-[margin] duration-250 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? 0 : 'var(--sidebar-w)' }}
      >
        {!isDashboard && meta && (
          <header className="sticky top-0 px-4 md:px-6 pt-4 z-30">
            <div className="shell-panel rounded-[20px] px-4 py-3 md:px-5 md:py-4 flex items-center gap-4">
              <button className="md:hidden btn btn-ghost p-1.5" onClick={toggleSidebar}>
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--color-violet-deep)' }}>
                  {meta.subtitle}
                </p>
                <h2 className="text-base md:text-lg font-bold leading-tight" style={{ color: 'var(--color-violet-deep)' }}>
                  {meta.title}
                </h2>
              </div>
              {meta.showAdd && (
                <button className="btn btn-primary btn-sm flex-shrink-0" onClick={onAddApplication}>
                  + Nouvelle candidature
                </button>
              )}
            </div>
          </header>
        )}

        <main className={isDashboard ? 'flex-1 relative' : 'flex-1 p-4 md:p-6 relative'}>
          <Outlet context={{ onAddApplication }} />
        </main>
      </div>
    </div>
  )
}
