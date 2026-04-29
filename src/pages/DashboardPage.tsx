import { ArrowRight, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { StatCard } from '@/components/dashboard/StatCard'
import { ApplicationRow } from '@/components/dashboard/ApplicationRow'
import { TipBanner } from '@/components/dashboard/TipBanner'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { MetricsCard } from '@/components/dashboard/MetricsCard'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatDate } from '@/lib/utils'
import { STATUS_COLORS } from '@/utils/statusLabels'
import type { Application } from '@/lib/types'

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

export function DashboardPage({ userId, applications, loading, onOpenDetail }: DashboardPageProps) {
  const { onAddApplication } = useOutletContext<OutletCtx>()
  const stats = useDashboardStats(applications)

  const recent = [...applications]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const actions = buildActions(applications).slice(0, 4)

  const companies = [...new Set(applications.map((a) => a.company))].slice(0, 10)

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="mx-4 md:mx-6 mt-4 md:mt-6 rounded-[28px] overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #6c3de0 0%, #4f46e5 55%, #312e81 100%)',
          boxShadow: '0 24px 60px rgba(49, 46, 129, 0.22)',
        }}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute left-10 bottom-[-3.5rem] h-32 w-32 rounded-full bg-white/10" />
        <div className="relative px-6 py-6 md:px-8 md:py-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70 font-semibold">Vue d&apos;ensemble</p>
            <h1 className="text-2xl md:text-[2rem] font-bold tracking-tight text-white mt-2">
              Tableau de bord
            </h1>
            <p className="text-sm capitalize mt-1 text-white">{TODAY}</p>
          </div>
          <button className="btn btn-secondary btn-sm flex-shrink-0" onClick={onAddApplication}>
            <Plus size={14} />
            Nouvelle candidature
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5">
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

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_320px] gap-5 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                    Actions du jour
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    Les actions concrètes à traiter en priorité.
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-[var(--radius-sm)] border"
                  style={{ fontSize: 11, background: 'var(--color-bg)', color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
                >
                  {actions.length}
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-[var(--radius-sm)] animate-pulse bg-[var(--color-bg)]" />
                  ))}
                </div>
              ) : actions.length === 0 ? (
                <div className="py-8 text-center" style={{ color: 'var(--color-muted)' }}>
                  <p className="text-sm font-semibold">Aucune action urgente</p>
                  <p className="text-xs mt-1">Le tableau se remplira dès qu&apos;une candidature demandera un suivi.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {actions.map(({ app, title, reason, tone }) => (
                    <button
                      key={`${app.id}-${title}`}
                      onClick={() => onOpenDetail(app)}
                      className="w-full rounded-[var(--radius-sm)] border text-left px-3 py-3 transition-colors hover:bg-[var(--color-bg)]"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{
                                background: tone.bg,
                                color: tone.fg,
                              }}
                            >
                              {title}
                            </span>
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                              {app.position}
                            </span>
                          </div>
                          <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-muted)' }}>
                            {app.company}{app.location ? ` · ${app.location}` : ''}
                          </p>
                          <p className="text-xs mt-2" style={{ color: 'var(--color-ink)' }}>
                            {reason}
                          </p>
                        </div>
                        <ArrowRight size={15} className="flex-shrink-0 mt-0.5 text-[var(--color-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                    Dernières candidatures
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    Les candidatures récemment ajoutées ou mises à jour.
                  </p>
                </div>
              </div>

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
                  <p className="text-xs mt-1">Commencez par en ajouter une.</p>
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
          </div>

          <div className="flex flex-col gap-5">
            <GoalCard userId={userId} applications={applications} />
            <MetricsCard applications={applications} />
          </div>
        </div>

        {!loading && <TipBanner applications={applications} />}
      </div>
    </div>
  )
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function buildActions(applications: Application[]) {
  return applications
    .map((app) => {
      if (app.status === 'INTERVIEW' || app.status === 'TECHNICAL_TEST') {
        return {
          app,
          priority: 100,
          title: 'Préparer',
          reason: `Entretien en cours. Dernière mise à jour le ${formatDate(app.updatedAt)}.`,
          tone: { bg: 'var(--color-amber-light)', fg: 'var(--color-amber-text)' },
        }
      }

      if (app.status === 'OFFER') {
        return {
          app,
          priority: 95,
          title: 'Décider',
          reason: `Offre reçue. Vérifie les conditions et la date de réponse.`,
          tone: { bg: 'var(--color-green-light)', fg: 'var(--color-green-text)' },
        }
      }

      if (app.status === 'PHONE_SCREEN') {
        return {
          app,
          priority: 85,
          title: 'Relancer',
          reason: `Pré-sélection active. Assure-toi d'avoir préparé la suite.`,
          tone: { bg: 'var(--color-violet-light)', fg: 'var(--color-violet-text)' },
        }
      }

      if (app.status === 'APPLIED') {
        const age = daysSince(app.appliedAt ?? app.updatedAt)
        if (age >= 7) {
          return {
            app,
            priority: 80 + Math.min(age, 20),
            title: 'Relancer',
            reason: `${age} jour(s) sans réponse depuis l'envoi de la candidature.`,
            tone: { bg: '#fff8f0', fg: '#b45309' },
          }
        }

        return {
          app,
          priority: 50 + age,
          title: 'Surveiller',
          reason: `Candidature envoyée récemment. Dernier envoi le ${formatDate(app.appliedAt ?? app.updatedAt)}.`,
          tone: { bg: 'var(--color-violet-light)', fg: 'var(--color-violet-text)' },
        }
      }

      if (app.status === 'WISHLIST') {
        const age = daysSince(app.createdAt)
        return {
          app,
          priority: 40 + Math.min(age, 20),
          title: 'Postuler',
          reason: age >= 5
            ? `Candidature sauvegardée depuis ${age} jour(s), à traiter avant qu'elle refroidisse.`
            : `Offre enregistrée récemment, prête à être préparée.`,
          tone: { bg: 'var(--color-bg)', fg: 'var(--color-muted)' },
        }
      }

      return null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.priority - a.priority)
}
