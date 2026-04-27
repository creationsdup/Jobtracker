import type { DashboardStats } from '@/hooks/useDashboardStats'

interface ProgressWidgetProps {
  stats: DashboardStats
}

const ROWS = [
  { key: 'wishlist',  label: 'Wishlist',    accent: 'var(--stat-wishlist-accent)' },
  { key: 'applied',   label: 'Postulé',     accent: 'var(--stat-applied-accent)' },
  { key: 'interview', label: 'Entretien',   accent: 'var(--stat-interview-accent)' },
  { key: 'offer',     label: 'Offre',       accent: 'var(--stat-offer-accent)' },
  { key: 'rejected',  label: 'Refusé',      accent: 'var(--stat-rejected-accent)' },
] as const

export function ProgressWidget({ stats }: ProgressWidgetProps) {
  const total = stats.total || 1

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Progression</span>
        <button
          disabled
          className="text-[11px] font-medium opacity-40 cursor-not-allowed"
          style={{ color: 'var(--color-violet-text)' }}
        >
          Analyser ↗
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {ROWS.map(({ key, label, accent }) => {
          const count = stats[key]
          const pct = Math.round((count / total) * 100)
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{count}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: accent }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
