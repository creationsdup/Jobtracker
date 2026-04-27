import { ApplicationCard } from '@/components/applications/ApplicationCard'
import type { Application } from '@/lib/types'

interface DashboardPageProps {
  applications: Application[]
  onOpenDetail: (app: Application) => void
}

export function DashboardPage({ applications, onOpenDetail }: DashboardPageProps) {
  const total = applications.length
  const applied = applications.filter((a) => a.status === 'applied').length
  const interview = applications.filter((a) => a.status === 'interview').length
  const offer = applications.filter((a) => a.status === 'offer').length

  const recent = [...applications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: total, color: 'text-[var(--color-ink)]' },
          { label: 'Postulées', value: applied, color: 'text-blue-500' },
          { label: 'Entretiens', value: interview, color: 'text-orange-500' },
          { label: 'Offres', value: offer, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5 text-center">
            <div className={`text-4xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Candidatures récentes</h3>
      </div>

      {recent.length === 0 ? (
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
