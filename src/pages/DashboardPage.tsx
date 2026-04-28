import { Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { StatCard } from '@/components/dashboard/StatCard'
import { ApplicationRow } from '@/components/dashboard/ApplicationRow'
import { ProgressWidget } from '@/components/dashboard/ProgressWidget'
import { TipBanner } from '@/components/dashboard/TipBanner'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { STATUS_COLORS } from '@/utils/statusLabels'
import type { Application } from '@/lib/types'

interface DashboardPageProps {
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
}

interface OutletCtx {
  onAddApplication: () => void
}

const TODAY = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const STAT_CARDS = [
  {
    key: 'wishlist' as const,
    label: 'Sauvegardée',
    accent: STATUS_COLORS.wishlist.accent,
    bg: STATUS_COLORS.wishlist.bg,
    fg: STATUS_COLORS.wishlist.text,
  },
  {
    key: 'applied' as const,
    label: 'Postulée',
    accent: STATUS_COLORS.applied.accent,
    bg: STATUS_COLORS.applied.bg,
    fg: STATUS_COLORS.applied.text,
  },
  {
    key: 'interview' as const,
    label: 'Entretien',
    accent: STATUS_COLORS.interview.accent,
    bg: STATUS_COLORS.interview.bg,
    fg: STATUS_COLORS.interview.text,
  },
  {
    key: 'offer' as const,
    label: 'Offre',
    accent: STATUS_COLORS.offer.accent,
    bg: STATUS_COLORS.offer.bg,
    fg: STATUS_COLORS.offer.text,
  },
  {
    key: 'rejected' as const,
    label: 'Refusée',
    accent: STATUS_COLORS.rejected.accent,
    bg: STATUS_COLORS.rejected.bg,
    fg: STATUS_COLORS.rejected.text,
  },
] as const

export function DashboardPage({ applications, loading, onOpenDetail }: DashboardPageProps) {
  const { onAddApplication } = useOutletContext<OutletCtx>()
  const stats = useDashboardStats(applications)

  const recent = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const companies = [...new Set(applications.map((a) => a.company))].slice(0, 10)

  return (
    <div className="flex flex-col min-h-full">

      {/* Topbar */}
      <div
        className="px-6 py-5 flex items-start justify-between gap-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-violet-deep)' }}>
            Tableau de bord
          </h1>
          <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--color-muted)' }}>{TODAY}</p>
        </div>
        <button className="btn btn-primary btn-sm flex-shrink-0" onClick={onAddApplication}>
          <Plus size={14} />
          Nouvelle candidature
        </button>
      </div>

      <div className="p-6 flex flex-col gap-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAT_CARDS.map(({ key, label, accent, bg, fg }) => (
            <StatCard
              key={key}
              label={label}
              count={stats[key]}
              accentColor={accent}
              badgeBg={bg}
              badgeFg={fg}
              loading={loading}
            />
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

          {/* Left — recent applications */}
          <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Dernières candidatures
            </h3>

            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-[var(--radius-sm)] animate-pulse bg-[var(--color-bg)]" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="py-10 text-center" style={{ color: 'var(--color-muted)' }}>
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-semibold">Aucune candidature</p>
                <p className="text-xs mt-1">Commencez par en ajouter une !</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {recent.map((app, i) => (
                  <ApplicationRow
                    key={app.id}
                    application={app}
                    colorVariant={(i % 2) as 0 | 1}
                    onClick={() => onOpenDetail(app)}
                  />
                ))}
              </div>
            )}

            {!loading && companies.length > 0 && (
              <div className="pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Entreprises
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {companies.map((company) => (
                    <span
                      key={company}
                      className="px-2 py-0.5 rounded-[var(--radius-sm)] border"
                      style={{ fontSize: 11, background: 'var(--color-bg)', color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — progression */}
          <ProgressWidget stats={stats} />
        </div>

        {/* Tip banner */}
        {!loading && <TipBanner applications={applications} />}
      </div>
    </div>
  )
}
