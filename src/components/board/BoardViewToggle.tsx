import { Columns, LayoutList } from 'lucide-react'
import type { BoardView } from '@/lib/boardView'
import { cn } from '@/lib/utils'

interface BoardViewToggleProps {
  value: BoardView
  onChange: (view: BoardView) => void
}

const OPTIONS = [
  { value: 'columns', label: 'Colonnes', icon: Columns },
  { value: 'list', label: 'Liste', icon: LayoutList },
] as const

export function BoardViewToggle({ value, onChange }: BoardViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Affichage"
      className="flex items-center gap-1 rounded-full bg-[var(--color-bg)] p-1 shrink-0"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => onChange(option)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'text-white' : 'text-[var(--color-muted)]',
            )}
            style={active ? { background: 'var(--color-primary)' } : undefined}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
