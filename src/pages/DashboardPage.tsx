import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { StatusPills } from '@/components/dashboard/StatusPills'
import { UrgencyCard } from '@/components/dashboard/UrgencyCard'
import { MetricsCard } from '@/components/dashboard/MetricsCard'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import type { Application } from '@/lib/types'

interface DashboardPageProps {
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
}

export function DashboardPage({ applications, loading, onOpenDetail }: DashboardPageProps) {
  const recent = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const sectors = [...new Set(applications.map((a) => a.company))].slice(0, 12)

  return (
    <div className="flex flex-col gap-4">
      {/* Alert banner — full width above columns */}
      {!loading && <AlertBanner applications={applications} onOpenDetail={onOpenDetail} />}

      {/* Two-column layout */}
      <div className="flex gap-5 items-start flex-col md:flex-row">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Status pills */}
          <StatusPills applications={applications} loading={loading} />

          {/* Recent applications card */}
          <div className="card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Dernières candidatures</h3>

            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-[var(--radius-sm)] animate-pulse bg-[var(--color-bg)]" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="empty-state py-10">
                <div className="text-4xl mb-2">📋</div>
                <p className="font-semibold text-sm">Aucune candidature</p>
                <p className="text-xs mt-1">Commencez par en ajouter une !</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onClick={() => onOpenDetail(app)}
                  />
                ))}
              </div>
            )}

            {/* Secteurs explorés */}
            {!loading && sectors.length > 0 && (
              <>
                <div className="border-t border-[var(--color-border)] pt-3 flex flex-col gap-2">
                  <span
                    className="text-[var(--color-muted)] font-semibold tracking-wider uppercase"
                    style={{ fontSize: 11 }}
                  >
                    Secteurs explorés
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sectors.map((company) => (
                      <span
                        key={company}
                        className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--color-muted)] border border-[var(--color-border)]"
                        style={{ fontSize: 12, background: 'var(--color-bg)' }}
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-full md:w-[260px] flex-shrink-0 flex flex-col gap-4">
          {!loading && <UrgencyCard applications={applications} />}
          <MetricsCard applications={applications} />
          <GoalCard applications={applications} />
        </div>
      </div>
    </div>
  )
}
