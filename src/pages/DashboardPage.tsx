import { useMemo, useEffect, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { Plus, Rocket, Briefcase, Activity, Users, Trophy, TrendingUp } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useGoals } from '@/hooks/useGoals'
import { formatDate } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { DashboardCard } from '@/components/ui/DashboardCard'
import { CompanyLogo } from '@/components/applications/CompanyLogo'
import type { Application } from '@/lib/types'

interface DashboardPageProps {
  userId: string
  userEmail: string
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}

interface OutletCtx {
  onAddApplication: () => void
}

const PIPELINE_STAGES: { key: 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'; label: string; color: string }[] = [
  { key: 'wishlist',  label: 'À postuler', color: '#9ca3af' },
  { key: 'applied',   label: 'Postulée',   color: '#007EA7' },
  { key: 'interview', label: 'Entretien',  color: '#F59E0B' },
  { key: 'offer',     label: 'Offres',     color: '#059669' },
  { key: 'rejected',  label: 'Refusée',    color: '#DC2626' },
]

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ─── Next best action ──────────────────────────────────────────────────────

interface NextAction {
  app: Application
  priority: number
  headline: string
  detail: string
  cta: string
  urgent: boolean
}

function buildNextActions(applications: Application[]): NextAction[] {
  return applications
    .flatMap((app): NextAction[] => {
      if (app.status === 'OFFER') {
        return [{
          app, priority: 100, cta: 'Traiter maintenant', urgent: true,
          headline: `Décider pour l'offre — ${app.company}`,
          detail: 'Une offre attend votre réponse.',
        }]
      }
      if (app.status === 'INTERVIEW' || app.status === 'TECHNICAL_TEST') {
        return [{
          app, priority: 90, cta: 'Préparer', urgent: false,
          headline: `Préparer l'entretien — ${app.company}`,
          detail: 'Relisez le poste avant le jour J.',
        }]
      }
      if (app.status === 'PHONE_SCREEN') {
        return [{
          app, priority: 80, cta: 'Faire un suivi', urgent: false,
          headline: `Faire un suivi — ${app.company}`,
          detail: 'Un premier échange a eu lieu.',
        }]
      }
      if (app.status === 'APPLIED') {
        const age = daysSince(app.appliedAt ?? app.updatedAt)
        if (age >= 7) {
          return [{
            app, priority: 70 + Math.min(age, 20), urgent: age >= 14, cta: 'Traiter maintenant',
            headline: `Relancer ${app.company}`,
            detail: `Sans réponse depuis ${age} jours.`,
          }]
        }
      }
      if (app.status === 'WISHLIST') {
        const age = daysSince(app.createdAt)
        if (age >= 5) {
          return [{
            app, priority: 40 + Math.min(age, 20), urgent: false, cta: 'Envoyer',
            headline: `Envoyer la candidature — ${app.company}`,
            detail: `Sauvegardée depuis ${age} jours.`,
          }]
        }
      }
      return []
    })
    .sort((a, b) => b.priority - a.priority)
}

// ─── Weekly activity buckets ────────────────────────────────────────────────

interface WeekBucket {
  weekNum: number
  rangeLabel: string
  count: number
}

function getWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function buildWeeklyBuckets(applications: Application[], weeks = 4): WeekBucket[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const count = applications.filter((a) => {
      const d = new Date(a.createdAt)
      return d >= start && d <= end
    }).length

    const monthShort = end.toLocaleDateString('fr-FR', { month: 'short' })
    buckets.push({
      weekNum: getWeekNumber(start),
      rangeLabel: `${start.getDate()}-${end.getDate()} ${monthShort}`,
      count,
    })
  }
  return buckets
}

// ─── Recent activity feed ───────────────────────────────────────────────────

interface ActivityEntry {
  id: string
  kind: 'added' | 'updated'
  app: Application
  time: Date
}

function buildActivityFeed(applications: Application[]): ActivityEntry[] {
  const entries: ActivityEntry[] = []
  for (const app of applications) {
    entries.push({ id: `add-${app.id}`, kind: 'added', app, time: new Date(app.createdAt) })
    if (app.updatedAt && app.updatedAt !== app.createdAt) {
      entries.push({ id: `upd-${app.id}`, kind: 'updated', app, time: new Date(app.updatedAt) })
    }
  }
  return entries.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5)
}

function formatActivityTime(date: Date): string {
  const now = new Date()
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === now.toDateString()) return `Aujourd'hui, ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Hier, ${time}`
  return formatDate(date.toISOString())
}

export function DashboardPage({ userId, userEmail, applications, loading, onOpenDetail, resolveLogo }: DashboardPageProps) {
  const { onAddApplication } = useOutletContext<OutletCtx>()
  const { profile } = useProfile(userId, userEmail)
  const { t, locale } = useTranslation()
  const pipelineStats = useDashboardStats(applications)
  const { activeGoal: goal } = useGoals(userId)

  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const [today, setToday] = useState(() =>
    new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  )
  useEffect(() => {
    setToday(new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    const now = new Date()
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(() => {
      setToday(new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }, msUntilMidnight)
    return () => clearTimeout(timer)
  }, [dateLocale])

  const firstName = profile?.fullName?.trim().split(/\s+/)[0]

  const stats = useMemo(() => {
    const total = applications.length
    const active = applications.filter((a) =>
      ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST'].includes(a.status),
    ).length
    const interview = applications.filter((a) => ['INTERVIEW', 'TECHNICAL_TEST'].includes(a.status)).length
    const offers = applications.filter((a) =>
      ['OFFER', 'ACCEPTED'].includes(a.status),
    ).length
    const applied = applications.filter((a) => a.status !== 'WISHLIST').length
    const progressed = applications.filter((a) =>
      ['INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
    ).length
    const convRate = applied > 0 ? Math.round((progressed / applied) * 100) : 0

    return { total, active, interview, offers, convRate }
  }, [applications])

  const heroCards = [
    { label: 'Candidatures',       value: stats.total,          icon: <Briefcase size={15} /> },
    { label: 'En cours',           value: stats.active,         icon: <Activity size={15} /> },
    { label: 'Entretien',          value: stats.interview,      icon: <Users size={15} /> },
    { label: 'Offres',             value: stats.offers,         icon: <Trophy size={15} /> },
    { label: 'Taux de conversion', value: `${stats.convRate}%`, icon: <TrendingUp size={15} /> },
  ]

  const nextActions = useMemo(() => buildNextActions(applications), [applications])
  const topAction = nextActions[0]

  const remindersEnabled = profile?.remindersEnabled ?? true
  const reminderThresholdDays = profile?.reminderThresholdDays ?? 7

  const followUps = useMemo(
    () => !remindersEnabled ? [] : applications
      .filter((a) => a.status === 'APPLIED')
      .map((a) => ({ app: a, age: daysSince(a.appliedAt ?? a.updatedAt) }))
      .filter(({ age }) => age >= reminderThresholdDays)
      .sort((a, b) => b.age - a.age),
    [applications, remindersEnabled, reminderThresholdDays],
  )

  const [weeksRange, setWeeksRange] = useState(4)
  const weeklyBuckets = useMemo(() => buildWeeklyBuckets(applications, weeksRange), [applications, weeksRange])
  const maxWeekly = Math.max(...weeklyBuckets.map((b) => b.count), 1)

  const activityFeed = useMemo(() => buildActivityFeed(applications), [applications])

  const monthOptions = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { value: i, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
    })
  }, [])
  const [monthsAgo, setMonthsAgo] = useState(0)

  const goalMonthApps = useMemo(() => {
    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    return applications.filter((a) => {
      const d = new Date(a.createdAt)
      return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear()
    })
  }, [applications, monthsAgo])

  const monthlyTarget = goal?.personal_target ?? 10
  const sentInMonth = goalMonthApps.length
  const sentPct = monthlyTarget > 0 ? Math.round((sentInMonth / monthlyTarget) * 100) : 0

  // Conversion réelle au sein des candidatures du mois sélectionné (pas d'objectif fabriqué)
  const interviewsInMonth = goalMonthApps.filter((a) =>
    ['INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status),
  ).length
  const interviewsConvPct = sentInMonth > 0 ? Math.round((interviewsInMonth / sentInMonth) * 100) : 0

  const offersInMonth = goalMonthApps.filter((a) => ['OFFER', 'ACCEPTED'].includes(a.status)).length
  const offersConvPct = sentInMonth > 0 ? Math.round((offersInMonth / sentInMonth) * 100) : 0

  const pipelineSegments = useMemo(() => {
    let cumulative = 0
    return PIPELINE_STAGES.map(({ key, color }) => {
      const pct = pipelineStats.total > 0 ? (pipelineStats[key] / pipelineStats.total) * 100 : 0
      const start = cumulative
      cumulative += pct
      return { key, color, start, end: cumulative }
    })
  }, [pipelineStats])

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mt-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            {t('dashboard.greeting')}{firstName ? ` ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--color-muted)' }}>{today}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-white text-sm font-semibold flex-shrink-0 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-cerulean) 100%)',
            boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--color-cerulean) 55%, transparent)',
          }}
          onClick={onAddApplication}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <Plus size={12} />
          </span>
          Nouvelle candidature
        </button>
      </div>

      {!loading && stats.total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-bg)' }}
          >
            <Rocket size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
            Aucune candidature pour l&apos;instant
          </p>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-muted)' }}>
            Ajoutez votre première candidature pour commencer à suivre votre recherche d&apos;emploi.
          </p>
          <button
            className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 mt-2 rounded-full text-white text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-cerulean) 100%)',
              boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--color-cerulean) 55%, transparent)',
            }}
            onClick={onAddApplication}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <Plus size={12} />
            </span>
            Nouvelle candidature
          </button>
        </div>
      ) : (
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        {/* Hero numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-shrink-0">
          {heroCards.map(({ label, value, icon }) => (
            loading ? (
              <div key={label} className="card px-4 py-3 h-[88px] animate-pulse" />
            ) : (
              <StatCard key={label} label={label} value={value} icon={icon} />
            )
          ))}
        </div>

        {/* Row 2 — next action / monthly goal / pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 auto-rows-fr">
          <DashboardCard
            title="Prochaine meilleure action"
            action={topAction?.urgent ? (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-red-light)', color: 'var(--color-danger)' }}
              >
                Urgent
              </span>
            ) : undefined}
          >
            {!topAction ? (
              <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
                Rien à signaler — tout est à jour.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[14px] font-bold leading-snug" style={{ color: 'var(--color-text)' }}>
                    {topAction.headline}
                  </p>
                  <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--color-muted)' }}>
                    {topAction.detail}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="btn btn-primary btn-sm text-[13px]"
                    onClick={() => onOpenDetail(topAction.app)}
                  >
                    {topAction.cta}
                  </button>
                  {followUps.length > 0 && (
                    <button
                      className="text-[12.5px] font-semibold bg-transparent border-0 cursor-pointer"
                      style={{ color: 'var(--color-accent)' }}
                      onClick={() => document.getElementById('relances-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    >
                      Voir les relances
                    </button>
                  )}
                </div>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Objectif du mois"
            action={(
              <select
                className="text-[12px] capitalize flex-shrink-0 bg-transparent border-0 outline-none cursor-pointer"
                style={{ color: 'var(--color-muted)' }}
                value={monthsAgo}
                onChange={(e) => setMonthsAgo(Number(e.target.value))}
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value} className="capitalize">{o.label}</option>
                ))}
              </select>
            )}
          >
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-6">
              <GoalRow label="candidatures envoyées" current={sentInMonth} target={monthlyTarget} pct={sentPct} />
              <ConversionRow label="entretiens obtenus" current={interviewsInMonth} pct={interviewsConvPct} />
              <ConversionRow label="offres reçues" current={offersInMonth} pct={offersConvPct} />
            </div>
          </DashboardCard>

          <DashboardCard
            title="Pipeline des candidatures"
            action={<Link to="/applications" className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>Voir toutes</Link>}
          >
            {loading ? (
              <div className="flex items-center gap-8">
                <div className="rounded-full animate-pulse flex-shrink-0" style={{ width: 140, height: 140, background: 'var(--color-bg)' }} />
                <div className="flex-1 flex flex-col gap-3">
                  {PIPELINE_STAGES.map(({ key }) => (
                    <div key={key} className="h-4 w-full rounded animate-pulse bg-[var(--color-bg)]" />
                  ))}
                </div>
              </div>
            ) : pipelineStats.total === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
                Ajoutez une candidature pour voir la répartition du pipeline.
              </p>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-5 flex-wrap">
                  <svg width={140} height={140} viewBox="0 0 136 136" className="flex-shrink-0">
                    <circle cx={68} cy={68} r={54} fill="none" stroke="var(--color-bg)" strokeWidth={16} />
                    <g transform="rotate(-90 68 68)">
                      {pipelineSegments
                        .filter((s) => s.end > s.start)
                        .map((s) => {
                          const r = 54
                          const circumference = 2 * Math.PI * r
                          const pct = s.end - s.start
                          const hasGap = pct < 100
                          const dash = Math.max(0, (pct / 100) * circumference - (hasGap ? 2.5 : 0))
                          return (
                            <circle
                              key={s.key}
                              cx={68}
                              cy={68}
                              r={r}
                              fill="none"
                              stroke={s.color}
                              strokeWidth={16}
                              strokeLinecap="round"
                              strokeDasharray={`${dash} ${circumference - dash}`}
                              strokeDashoffset={-(s.start / 100) * circumference}
                            />
                          )
                        })}
                    </g>
                    <text x={68} y={64} textAnchor="middle" fontSize={24} fontWeight={800} style={{ fill: 'var(--color-text)' }}>
                      {pipelineStats.total}
                    </text>
                    <text x={68} y={82} textAnchor="middle" fontSize={10.5} style={{ fill: 'var(--color-muted)' }}>
                      candidatures
                    </text>
                  </svg>
                  <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                    {PIPELINE_STAGES.map(({ key, label, color }) => {
                      const count = pipelineStats[key]
                      const pct = Math.round((count / pipelineStats.total) * 100)
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-[11.5px] flex-1 truncate" style={{ color: 'var(--color-ink)' }}>{label}</span>
                          <span className="text-[11.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{count}</span>
                          <span className="text-[10.5px] w-9 text-right" style={{ color: 'var(--color-muted)' }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {stats.active === 0 && (
                  <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                    Ajoutez une candidature pour relancer le pipeline.
                  </p>
                )}
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Row 3 — follow-ups / weekly chart / activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 auto-rows-fr">
          <DashboardCard
            title="Relances urgentes"
            className="lg:col-span-1"
            action={followUps.length > 0 ? (
              <Link to="/applications" className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                Voir toutes ({followUps.length})
              </Link>
            ) : undefined}
          >
            <div id="relances-card" className="flex flex-col gap-1 h-full min-h-0 overflow-y-auto">
              {followUps.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
                  Aucune relance à faire pour le moment 👍
                </p>
              ) : (
                followUps.slice(0, 3).map(({ app, age }) => {
                  const tone = age >= 21
                    ? { bg: 'var(--color-red-light)', fg: 'var(--color-danger)' }
                    : age >= 10
                      ? { bg: 'var(--color-amber-light)', fg: 'var(--color-warning)' }
                      : { bg: 'var(--color-cerulean-light)', fg: 'var(--color-accent)' }
                  return (
                    <div key={app.id} className="flex items-center gap-3 py-2">
                      <CompanyLogo company={app.company} logoUrl={resolveLogo(app.company)} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>{app.company}</p>
                        <p className="text-[11.5px] truncate" style={{ color: 'var(--color-muted)' }}>{app.position}</p>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        {age}j
                      </span>
                      <button className="btn btn-secondary btn-sm text-[12px] flex-shrink-0" onClick={() => onOpenDetail(app)}>
                        Relancer
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Candidatures par semaine"
            action={(
              <select
                className="text-[12px] flex-shrink-0 bg-transparent border-0 outline-none cursor-pointer"
                style={{ color: 'var(--color-muted)' }}
                value={weeksRange}
                onChange={(e) => setWeeksRange(Number(e.target.value))}
              >
                <option value={4}>4 dernières semaines</option>
                <option value={8}>8 dernières semaines</option>
                <option value={12}>12 dernières semaines</option>
              </select>
            )}
          >
            <div className="flex items-end justify-between gap-2 h-28 mt-auto">
              {weeklyBuckets.map((b) => {
                const barH = Math.max(4, (b.count / maxWeekly) * 64)
                return (
                  <div key={b.weekNum} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[12px] font-bold" style={{ color: 'var(--color-text)' }}>{b.count}</span>
                    <div className="w-full rounded-t-[6px]" style={{ height: barH, background: 'var(--color-accent)' }} />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              {weeklyBuckets.map((b) => (
                <span key={b.weekNum} className="flex-1 text-[10px] text-center leading-tight" style={{ color: 'var(--color-muted)' }}>
                  S{b.weekNum}{weeksRange <= 4 && <><br />{b.rangeLabel}</>}
                </span>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Activité récente"
            action={<Link to="/applications" className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>Voir tout</Link>}
          >
            <div className="flex flex-col gap-1 h-full min-h-0 overflow-y-auto">
              {activityFeed.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
                  Aucune activité récente.
                </p>
              ) : (
                activityFeed.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onOpenDetail(entry.app)}
                    className="w-full text-left flex items-center gap-3 py-2 -mx-1 px-1 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-bg)]"
                  >
                    <span className="relative flex-shrink-0">
                      <CompanyLogo company={entry.app.company} logoUrl={resolveLogo(entry.app.company)} size={28} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {entry.kind === 'added' ? 'Candidature ajoutée' : 'Mise à jour'} — {entry.app.company}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                        {entry.app.position}
                      </p>
                    </div>
                    <span className="text-[10.5px] flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
                      {formatActivityTime(entry.time)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
      )}
    </div>
  )
}

function GoalRow({ label, current, target, pct }: { label: string; current: number; target: number; pct: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>
          {current} / {target} {label}
        </span>
        <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, pct)}%`, background: 'var(--color-accent)' }}
        />
      </div>
    </div>
  )
}

// Affiche un taux de conversion réel (pas d'objectif fabriqué : on n'a pas de cible
// "entretiens"/"offres" dans le schéma, seulement un nombre de candidatures cible).
function ConversionRow({ label, current, pct }: { label: string; current: number; pct: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>
          {current} {label}
        </span>
        <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, pct)}%`, background: 'var(--color-accent)' }}
        />
      </div>
    </div>
  )
}
