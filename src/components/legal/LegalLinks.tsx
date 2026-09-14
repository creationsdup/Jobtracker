import { LEGAL_PAGES, type LegalPageId } from '@/lib/legalRoutes'
import { cn } from '@/lib/utils'

interface LegalLinksProps {
  /** Sur la barre sombre du pied de page de l'app */
  onDark?: boolean
  current?: LegalPageId
  className?: string
}

// WHY: liens <a> classiques et non <Link> : les pages légales sont servies hors du routeur par
// main.tsx, qui ne lit l'adresse qu'au chargement de la page.
export function LegalLinks({ onDark = false, current, className }: LegalLinksProps) {
  return (
    <nav aria-label="Informations légales" className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {LEGAL_PAGES.map(({ id, path, label }, index) => (
        <span key={id} className="flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden className={onDark ? 'text-[rgba(255,255,255,0.3)]' : 'text-[var(--color-subtle)]'}>·</span>
          )}
          <a
            href={path}
            aria-current={id === current ? 'page' : undefined}
            className={cn(
              'no-underline hover:underline',
              onDark && 'text-[11px] text-[rgba(255,255,255,0.6)]',
              !onDark && (id === current ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-muted)] hover:text-[var(--color-primary)]'),
            )}
          >
            {label}
          </a>
        </span>
      ))}
    </nav>
  )
}
