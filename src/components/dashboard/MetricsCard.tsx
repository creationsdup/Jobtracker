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

interface MetricRowProps {
  label: string
  value: string
  sub?: string
  color?: string
}

function MetricRow({ label, value, sub, color = 'var(--color-ink)' }: MetricRowProps) {
  return (
    <div
      className="flex items-center justify-between py-3 gap-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] font-medium truncate" style={{ color: 'var(--color-ink)' }}>
          {label}
        </span>
        {sub && (
          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
            {sub}
          </span>
        )}
      </div>
      <span className="text-xl font-bold flex-shrink-0" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export function MetricsCard({ applications }: MetricsCardProps) {
  const applied = applications.filter((a) => a.status !== 'WISHLIST').length
  const progressed = applications.filter((a) =>
    ['INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
  ).length
  const convRate = applied > 0 ? Math.round((progressed / applied) * 100) : 0

  const responseCount = applications.filter((a) =>
    ['PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
  ).length
  const responseRate = applied > 0 ? Math.round((responseCount / applied) * 100) : 0

  const avgDays = avgResponseDays(applications)
  const companies = new Set(applications.map((a) => a.company)).size
  const rejected = applications.filter((a) => a.status === 'REJECTED').length
  const rejectionRate = applied > 0 ? Math.round((rejected / applied) * 100) : 0

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-5 flex flex-col">
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
        Métriques clés
      </h3>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-muted)' }}>
        Indicateurs globaux de ta recherche
      </p>

      <div className="flex flex-col">
        <MetricRow
          label="Taux de réponse"
          value={`${responseRate}%`}
          sub={`${responseCount} réponse${responseCount !== 1 ? 's' : ''} sur ${applied} envoyée${applied !== 1 ? 's' : ''}`}
          color="#007EA7"
        />
        <MetricRow
          label="Taux de conversion"
          value={`${convRate}%`}
          sub="candidature → entretien ou mieux"
          color="#003459"
        />
        <MetricRow
          label="Délai moyen de réponse"
          value={avgDays !== null ? `${avgDays}j` : '—'}
          sub={avgDays !== null ? 'entre envoi et entretien' : 'pas encore de données'}
          color="#92400E"
        />
        <MetricRow
          label="Entreprises contactées"
          value={String(companies)}
          sub="entreprises distinctes"
          color="#059669"
        />
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>
              Taux de refus
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
              {rejected} refus sur {applied} envoyée{applied !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-xl font-bold flex-shrink-0" style={{ color: rejectionRate > 50 ? '#DC2626' : 'var(--color-ink)' }}>
            {`${rejectionRate}%`}
          </span>
        </div>
      </div>
    </div>
  )
}
