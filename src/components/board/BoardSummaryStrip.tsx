import type { BoardSummary } from '@/lib/boardSummary'
import { cn } from '@/lib/utils'

interface BoardSummaryStripProps {
  summary: BoardSummary
}

export function BoardSummaryStrip({ summary }: BoardSummaryStripProps) {
  // WHY: sur téléphone, seuls « En cours » et « Relances à faire » restent visibles (2 colonnes).
  const items = [
    { id: 'active', label: 'En cours', value: summary.active, onMobile: true, alert: false },
    { id: 'interviews', label: 'Entretiens', value: summary.interviews, onMobile: false, alert: false },
    { id: 'offers', label: 'Offres', value: summary.offers, onMobile: false, alert: false },
    { id: 'followUps', label: 'Relances à faire', value: summary.followUps, onMobile: true, alert: summary.followUps > 0 },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
      {items.map(({ id, label, value, onMobile, alert }) => (
        <div
          key={id}
          className={cn('card px-4 py-3', !onMobile && 'hidden md:block')}
          style={alert ? { borderColor: 'var(--color-warning)' } : undefined}
        >
          <p
            className="text-[22px] md:text-[26px] font-extrabold leading-none"
            style={{ color: alert ? 'var(--color-status-interview-fg)' : 'var(--color-primary)' }}
          >
            {value}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-[var(--color-muted)]">{label}</p>
        </div>
      ))}
    </div>
  )
}
