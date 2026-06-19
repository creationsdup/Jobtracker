import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { MobileBottomNav } from './MobileBottomNav'

interface AppShellProps {
  userId: string
  userEmail: string
  applicationsCount: number
  onLogout: () => void
  onAddApplication: () => void
}

export function AppShell({ userId, userEmail, applicationsCount, onLogout, onAddApplication }: AppShellProps) {
  // WHY: le Dashboard est conçu comme un écran figé (tout doit rentrer sans scroll),
  // les autres pages gardent un défilement normal car leur contenu est variable/long.
  const { pathname } = useLocation()
  const isFixedScreen = pathname === '/'

  return (
    <div className={`flex ${isFixedScreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`} style={{ background: 'var(--color-bg)' }}>
      <Sidebar
        userId={userId}
        userEmail={userEmail}
        applicationsCount={applicationsCount}
        onLogout={onLogout}
      />

      <div className={`flex-1 flex flex-col min-w-0 ${isFixedScreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <main className={`p-4 md:p-8 pb-24 md:pb-8 flex-1 ${isFixedScreen ? 'overflow-hidden flex flex-col min-h-0' : ''}`}>
          <Outlet context={{ onAddApplication }} />
        </main>

        <Footer />
      </div>

      <MobileBottomNav />
    </div>
  )
}
