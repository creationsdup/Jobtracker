import { Outlet } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { LiteTopBar } from './LiteTopBar'
import { Footer } from './Footer'

interface LiteShellProps {
  onAddApplication: () => void
}

// WHY: l'édition lite n'a qu'une page (le tableau) : une barre du haut remplace la barre latérale
// et la barre d'onglets mobile d'AppShell, qui reste la coquille de l'édition full.
export function LiteShell({ onAddApplication }: LiteShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <LiteTopBar onAddApplication={onAddApplication} />

      <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
        <Outlet context={{ onAddApplication }} />
      </main>

      <Footer />

      <button
        type="button"
        onClick={onAddApplication}
        aria-label="Nouvelle candidature"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
        style={{
          background: 'var(--color-primary)',
          bottom: 'calc(1rem + env(safe-area-inset-bottom))',
          boxShadow: '0 10px 24px -8px rgba(0, 59, 92, 0.55)',
        }}
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
