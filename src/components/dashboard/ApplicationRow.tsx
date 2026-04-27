import { StatusBadge } from '@/components/applications/StatusBadge'
import type { Application } from '@/lib/types'

const COLOR_VARIANTS = [
  { bg: 'var(--color-violet-light)', fg: 'var(--color-violet-dark)' },
  { bg: 'var(--color-green-light)',  fg: 'var(--color-green-text)' },
]

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff}j`
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)}sem`
  return `Il y a ${Math.floor(diff / 30)}mois`
}

interface ApplicationRowProps {
  application: Application
  colorVariant: 0 | 1
  onClick: () => void
}

export function ApplicationRow({ application, colorVariant, onClick }: ApplicationRowProps) {
  const { company, position, location, status, createdAt } = application
  const { bg, fg } = COLOR_VARIANTS[colorVariant]

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg)] transition-colors duration-100 border-0 bg-transparent cursor-pointer"
    >
      <div
        className="flex-shrink-0 flex items-center justify-center font-bold text-sm"
        style={{ width: 38, height: 38, borderRadius: 9, background: bg, color: fg }}
      >
        {company[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{position}</p>
        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
          {company}{location ? ` · ${location}` : ''}
        </p>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <StatusBadge status={status} />
        <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
          {relativeDate(createdAt)}
        </span>
      </div>
    </button>
  )
}
