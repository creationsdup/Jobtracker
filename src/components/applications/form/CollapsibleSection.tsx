import { useId, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  hint: string
  icon: LucideIcon
  open: boolean
  onToggle: () => void
  children: ReactNode
}

// Bloc de champs facultatifs, replié derrière un en-tête cliquable pour garder le formulaire court.
export function CollapsibleSection({ title, hint, icon: Icon, open, onToggle, children }: CollapsibleSectionProps) {
  const contentId = useId()

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-[var(--radius-lg)] transition-colors hover:bg-[var(--color-bg-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-highlight)]"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-[var(--color-surface)] text-[var(--color-accent)] flex-shrink-0">
          <Icon size={16} aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-[var(--color-ink)]">{title}</span>
          {!open && <span className="block text-xs text-[var(--color-muted)] truncate">{hint}</span>}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn('text-[var(--color-muted)] transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div id={contentId} className="px-4 pb-4 pt-1 flex flex-col gap-4">
          {children}
        </div>
      )}
    </section>
  )
}
