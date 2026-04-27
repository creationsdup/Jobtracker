import { ApplicationCard } from '@/components/applications/ApplicationCard'
import type { Application } from '@/lib/types'

interface DashboardPageProps {
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
}

export function DashboardPage({ applications, loading, onOpenDetail }: DashboardPageProps) {
  const applied = applications.filter((a) => a.status === 'APPLIED').length
  const interview = applications.filter((a) => a.status === 'INTERVIEW').length
  const offer = applications.filter((a) => a.status === 'OFFER' || a.status === 'ACCEPTED').length

  const recent = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: applications.length, color: 'text-[var(--color-ink)]' },
          { label: 'Postulées', value: applied, color: 'text-blue-500' },
          { label: 'Entretiens', value: interview, color: 'text-orange-500' },
          { label: 'Offres', value: offer, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5 text-center">
            <div className={`text-4xl font-bold ${color}`}>{loading ? '—' : value}</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Candidatures récentes</h3>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card px-5 py-4 h-16 animate-pulse bg-[var(--color-bg)]" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="empty-state">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-semibold">Aucune candidature</p>
          <p className="text-xs mt-1">Commencez par en ajouter une !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map((app) => (
            <ApplicationCard key={app.id} application={app} onClick={() => onOpenDetail(app)} />
          ))}
        </div>
      )}
    </div>
  )
}
