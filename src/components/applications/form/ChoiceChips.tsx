import { useId } from 'react'
import type { ChoiceOption } from '@/lib/applicationDraft'
import { cn } from '@/lib/utils'

interface ChoiceChipsProps<T extends string> {
  label: string
  options: ReadonlyArray<ChoiceOption<T>>
  isSelected: (value: T) => boolean
  onSelect: (value: T) => void
}

// Groupe de puces cliquables, à la place d'un <select>, pour choisir en un clic.
export function ChoiceChips<T extends string>({ label, options, isSelected, onSelect }: ChoiceChipsProps<T>) {
  const labelId = useId()

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-xs font-medium text-[var(--color-ink-secondary)]">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = isSelected(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.value)}
              className={cn(
                'min-h-[36px] px-3.5 rounded-full border text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-highlight)]',
                selected
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] border-[var(--color-border-hover)] text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
