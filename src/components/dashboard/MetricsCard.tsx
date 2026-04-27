import type { Application } from '@/lib/types'

function avgResponseDays(applications: Application[]): number | null {
  const reached = applications.filter(
    (a) =>
      (a.status === 'INTERVIEW' || a.status === 'TECHNICAL_TEST' || a.status === 'OFFER' || a.status === 'ACCEPTED') &&
      a.appliedAt,
  )
  if (!reached.length) return null
  const total = reached.reduce((sum, a) => {
    const days = Math.floor(
      (new Date(a.updatedAt).getTime() - new Date(a.appliedAt!).getTime()) / 86_400_000,
    )
    return sum + Math.max(0, days)
  }, 0)
  return Math.round(total / reached.length)
}

interface MetricsCardProps {
  applications: Application[]
}

export function MetricsCard({ applications }: MetricsCardProps) {
  const applied = applications.filter((a) => a.status !== 'WISHLIST').length
  const progressed = applications.filter((a) =>
    ['INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
  ).length
  const rate = applied > 0 ? Math.round((progressed / applied) * 100) : 0
  const avgDays = avgResponseDays(applications)

  return (
    <div className="card p-4 flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Métriques clés
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div
          className="flex flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2.5"
          style={{ background: 'var(--color-bg)' }}
        >
          <span className="font-medium leading-none" style={{ fontSize: 22 }}>
            {rate}%
          </span>
          <span className="text-[var(--color-muted)] leading-tight" style={{ fontSize: 11 }}>
            Taux de transformation
          </span>
        </div>
        <div
          className="flex flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2.5"
          style={{ background: 'var(--color-bg)' }}
        >
          <span className="font-medium leading-none" style={{ fontSize: 22 }}>
            {avgDays !== null ? `${avgDays}j` : '—'}
          </span>
          <span className="text-[var(--color-muted)] leading-tight" style={{ fontSize: 11 }}>
            Délai moyen de réponse
          </span>
        </div>
      </div>
    </div>
  )
}
