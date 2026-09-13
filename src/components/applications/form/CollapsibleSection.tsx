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

// Bloc de champs facultatifs, replié par défaut — même style que le bloc « Correspondance » de la fiche.
export function CollapsibleSection({ title, hint, icon: Icon, open, onToggle, children }: CollapsibleSectionProps) {
  const contentId = useId()

  return (
    <section className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full min-h-[32px] flex items-center justify-between gap-3 text-left rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-highlight)]"
      >
        <span className="text-sm font-semibold flex items-center gap-1.5 text-[var(--color-ink)]">
          <Icon size={13} aria-hidden />
          {title}
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          {!open && <span className="hidden sm:block text-xs text-[var(--color-muted)] truncate">{hint}</span>}
          <ChevronDown
            size={14}
            aria-hidden
            className={cn('flex-shrink-0 text-[var(--color-muted)] transition-transform duration-150', open && 'rotate-180')}
          />
        </span>
      </button>

      {open && (
        <div id={contentId} className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-col gap-4">
          {children}
        </div>
      )}
    </section>
  )
}
