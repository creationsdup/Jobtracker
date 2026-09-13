import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  icon?: ReactNode
}

/** Liste déroulante en pastille, avec chevron personnalisé. */
export function FilterSelect({ value, onChange, options, icon }: FilterSelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted)]">
          {icon}
        </span>
      )}
      <select
        className={`appearance-none rounded-full text-[13px] font-medium cursor-pointer outline-none transition-colors ${icon ? 'pl-9' : 'pl-4'} pr-9 py-2 bg-white hover:bg-[var(--color-bg)]`}
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted)]" />
    </div>
  )
}
