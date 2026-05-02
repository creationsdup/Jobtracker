import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { MetricsCard } from '@/components/dashboard/MetricsCard'
import { useGoals } from '@/hooks/useGoals'
import { formatDate } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

interface DashboardPageProps {
  userId: string
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

const STATUS_BAR_CONFIG: { status: ApplicationStatus; color: string }[] = [
  { status: 'WISHLIST',       color: '#a78bfa' },
  { status: 'APPLIED',        color: '#60a5fa' },
  { status: 'PHONE_SCREEN',   color: '#34d399' },
  { status: 'INTERVIEW',      color: '#fbbf24' },
  { status: 'TECHNICAL_TEST', color: '#f97316' },
  { status: 'OFFER',          color: '#10b981' },
  { status: 'ACCEPTED',       color: '#059669' },
  { status: 'REJECTED',       color: '#f87171' },
  { status: 'WITHDRAWN',      color: '#9ca3af' },
]

export function DashboardPage({ userId, applications, loading, onOpenDetail }: DashboardPageProps) {
  const { onAddApplication } = useOutletContext<OutletCtx>()
  useGoals(userId, applications)

  const stats = useMemo(() => {
    const total = applications.length
    const active = applications.filter((a) =>
      ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST'].includes(a.status),
    ).length
    const offers = applications.filter((a) =>
      ['OFFER', 'ACCEPTED'].includes(a.status),
    ).length
    const applied = applications.filter((a) => a.status !== 'WISHLIST').length
    const progressed = applications.filter((a) =>
      ['INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
    ).length
    const convRate = applied > 0 ? Math.round((progressed / applied) * 100) : 0

    return { total, active, offers, convRate }
  }, [applications])

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<ApplicationStatus, number>> = {}
    for (const app of applications) {
      counts[app.status] = (counts[app.status] ?? 0) + 1
    }
    return counts
  }, [applications])

  const attentionItems = useMemo(() => buildAttentionItems(applications).slice(0, 5), [applications])

  const heroCards = [
    { label: 'Candidatures', value: stats.total, sub: 'au total', color: '#6c3de0' },
    { label: 'En cours', value: stats.active, sub: 'actives', color: '#3b82f6' },
    { label: 'Offres reçues', value: stats.offers, sub: 'offer / acceptée', color: '#10b981' },
    { label: 'Taux de conversion', value: `${stats.convRate}%`, sub: 'postulé → entretien+', color: '#f59e0b' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--color-muted)' }}>
            Vue d&apos;ensemble
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1" style={{ color: 'var(--color-ink)' }}>
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
        {/* Hero numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {heroCards.map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-5 flex flex-col gap-1"
              style={{ borderTop: `3px solid ${color}` }}
            >
              {loading ? (
                <div className="h-9 w-16 rounded animate-pulse bg-[var(--color-bg)]" />
              ) : (
                <span className="font-bold leading-none" style={{ fontSize: 34, color }}>
                  {value}
                </span>
              )}
              <span className="text-sm font-semibold mt-1" style={{ color: 'var(--color-ink)' }}>
                {label}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                {sub}
              </span>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Répartition par statut
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {stats.total} candidature{stats.total !== 1 ? 's' : ''} au total
            </p>
          </div>

          {loading ? (
            <div className="h-5 w-full rounded-full animate-pulse bg-[var(--color-bg)]" />
          ) : stats.total === 0 ? (
            <div className="h-5 w-full rounded-full bg-[var(--color-bg)]" />
          ) : (
            <div className="flex rounded-full overflow-hidden h-5 gap-px">
              {STATUS_BAR_CONFIG.map(({ status, color }) => {
                const count = statusCounts[status] ?? 0
                if (count === 0) return null
                const pct = (count / stats.total) * 100
                return (
                  <div
                    key={status}
                    style={{ width: `${pct}%`, background: color, minWidth: 4 }}
                    title={`${STATUS_LABELS[status]}: ${count}`}
                  />
                )
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {STATUS_BAR_CONFIG.map(({ status, color }) => {
              const count = statusCounts[status] ?? 0
              if (count === 0) return null
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Attention + Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Candidatures qui méritent une attention */}
          <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                  À surveiller
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Candidatures qui méritent une attention
                </p>
              </div>
              {attentionItems.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}
                >
                  {attentionItems.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-[var(--radius-sm)] animate-pulse bg-[var(--color-bg)]" />
                ))}
              </div>
            ) : attentionItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Tout est à jour</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                  Aucune candidature ne nécessite d&apos;action immédiate.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {attentionItems.map(({ app, tag, tagColor, reason }) => (
                  <button
                    key={app.id}
                    onClick={() => onOpenDetail(app)}
                    className="w-full rounded-[var(--radius-sm)] border text-left px-3 py-2.5 transition-colors hover:bg-[var(--color-bg)] flex items-center gap-3"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                          style={{ background: tagColor.bg, color: tagColor.fg }}
                        >
                          {tag}
                        </span>
                        <span className="text-[13px] font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                          {app.position}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                        {app.company}{app.location ? ` · ${app.location}` : ''} · {reason}
                      </p>
                    </div>
                    <ArrowRight size={14} className="flex-shrink-0" style={{ color: 'var(--color-muted)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Metrics */}
          <MetricsCard applications={applications} />
        </div>
      </div>
    </div>
  )
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

interface AttentionItem {
  app: Application
  tag: string
  tagColor: { bg: string; fg: string }
  reason: string
  priority: number
}

function buildAttentionItems(applications: Application[]): AttentionItem[] {
  return applications
    .flatMap((app): AttentionItem[] => {
      if (app.status === 'OFFER') {
        return [{
          app, priority: 100,
          tag: 'Décision à prendre',
          tagColor: { bg: '#d1fae5', fg: '#065f46' },
          reason: 'Offre reçue — à accepter ou refuser',
        }]
      }
      if (app.status === 'INTERVIEW' || app.status === 'TECHNICAL_TEST') {
        return [{
          app, priority: 90,
          tag: 'Entretien en cours',
          tagColor: { bg: '#fef3c7', fg: '#92400e' },
          reason: `Dernière mise à jour le ${formatDate(app.updatedAt)}`,
        }]
      }
      if (app.status === 'PHONE_SCREEN') {
        return [{
          app, priority: 80,
          tag: 'Pré-sélection',
          tagColor: { bg: '#ede9fe', fg: '#5b21b6' },
          reason: 'Suivi à assurer avant la prochaine étape',
        }]
      }
      if (app.status === 'APPLIED') {
        const age = daysSince(app.appliedAt ?? app.updatedAt)
        if (age >= 7) {
          return [{
            app, priority: 70 + Math.min(age, 20),
            tag: 'Relance suggérée',
            tagColor: { bg: '#fff7ed', fg: '#c2410c' },
            reason: `${age} jour${age > 1 ? 's' : ''} sans réponse`,
          }]
        }
      }
      if (app.status === 'WISHLIST') {
        const age = daysSince(app.createdAt)
        if (age >= 5) {
          return [{
            app, priority: 40 + Math.min(age, 20),
            tag: 'À postuler',
            tagColor: { bg: 'var(--color-bg)', fg: 'var(--color-muted)' },
            reason: `Sauvegardée depuis ${age} jour${age > 1 ? 's' : ''}`,
          }]
        }
      }
      return []
    })
    .sort((a, b) => b.priority - a.priority)
}
