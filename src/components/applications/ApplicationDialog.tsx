import { useEffect, useId, type FormEventHandler, type KeyboardEventHandler, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplicationDialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Colonne de droite (fiche : actions et timeline) ; élargit la fenêtre sur ordinateur. */
  aside?: ReactNode
  footer?: ReactNode
  /** Quand il est fourni, la fenêtre est un <form> (formulaire de candidature). */
  onSubmit?: FormEventHandler<HTMLFormElement>
  onKeyDown?: KeyboardEventHandler<HTMLFormElement>
  /** Fenêtres ouvertes par-dessus (import IA, lettre IA). */
  overlays?: ReactNode
  /** Joue l'animation d'ouverture — désactivée quand la fiche et son formulaire se remplacent sur place. */
  appear?: boolean
}

const PANEL_CLASS = 'w-full max-h-[92dvh] sm:max-h-[calc(100dvh-48px)] flex flex-col bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]'

// Cadre commun au formulaire et à la fiche d'une candidature : fenêtre centrée (pleine largeur sur
// téléphone), en-tête, contenu qui défile, colonne de droite et pied facultatifs.
export function ApplicationDialog({ title, onClose, children, aside, footer, onSubmit, onKeyDown, overlays, appear = true }: ApplicationDialogProps) {
  const titleId = useId()
  const panelClass = cn(PANEL_CLASS, aside ? 'sm:max-w-[1000px]' : 'sm:max-w-[560px]')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const content = (
    <>
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
        <h2 id={titleId} className="text-lg font-bold text-[var(--color-ink)]">{title}</h2>
        <button type="button" className="btn btn-ghost p-1.5" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
      </header>

      {aside ? (
        // WHY: sur ordinateur, chaque colonne défile seule ; sur téléphone, la colonne de droite passe dessous.
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div className="px-6 pb-6 flex flex-col gap-5 md:min-h-0 md:overflow-y-auto">
            {children}
          </div>
          <aside className="px-6 pt-5 pb-6 md:pt-0 flex flex-col gap-5 border-t md:border-t-0 md:border-l border-[var(--color-border)] md:min-h-0 md:overflow-y-auto">
            {aside}
          </aside>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          {children}
        </div>
      )}

      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[var(--color-border)]">
          {footer}
        </footer>
      )}
    </>
  )

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-6', appear && 'animate-fade-in')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {onSubmit ? (
        <form role="dialog" aria-modal="true" aria-labelledby={titleId} noValidate onSubmit={onSubmit} onKeyDown={onKeyDown} className={panelClass}>
          {content}
        </form>
      ) : (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={panelClass}>
          {content}
        </div>
      )}
      {overlays}
    </div>
  )
}
