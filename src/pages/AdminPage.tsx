import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchAdminData, type AdminApiError, type AdminData } from '@/lib/adminApi'
import { computeFunnel, computeKpis, formatSince, toWeeks } from '@/lib/adminStats'
import { BoardTable } from '@/components/admin/BoardTable'
import { FunnelBars } from '@/components/admin/FunnelBars'
import { KpiGrid } from '@/components/admin/KpiGrid'
import { WeeklyChart } from '@/components/admin/WeeklyChart'
import { cn } from '@/lib/utils'

const PERIODS = [7, 30, 90] as const

export function AdminPage() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<AdminApiError | null>(null)
  // WHY: figé au chargement des données, pour que « il y a 3 j » ne bouge pas entre deux rendus.
  // Un useMemo sur [data] ferait échouer npm run lint (--max-warnings 0) : exhaustive-deps y voit
  // une dépendance inutile, puisque Date.now() ne lit pas data.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    void fetchAdminData(days).then((result) => {
      if (!alive) return
      if ('error' in result) setError(result)
      else { setData(result); setNow(Date.now()) }
    })
    return () => { alive = false }
  }, [days])
  const since = data ? formatSince(data.meta.measurement_start) : ''
  // WHY: formatSince(null) rend une phrase complète (« aucune mesure enregistrée pour
  // l’instant »), pas un complément — insérée telle quelle dans « Mesure d’usage {since}. »
  // ou « n’existent que {since} », elle casse la grammaire. On distingue donc l’état non
  // mesuré des deux points d’insertion, sans toucher à formatSince (testée telle quelle).
  const measured = data?.meta.measurement_start != null
  const kpis = useMemo(
    () => (data ? computeKpis(data.boards, data.sessions, { now, days, measurementStart: data.meta.measurement_start }) : null),
    [data, days, now],
  )
  const weeks = useMemo(() => (data ? toWeeks(data.days) : []), [data])
  const funnel = useMemo(
    () => (data ? computeFunnel(data.boards, data.meta.measurement_start) : []),
    [data],
  )
  const funnelEligible = funnel[0]?.count ?? 0

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <Link to="/mon-tableau" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-accent)] no-underline hover:underline">
        <ArrowLeft size={15} />
        Retour aux réglages
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-primary)]">Tableau de bord</h1>
          {data && (
            <p className="text-[13px] text-[var(--color-muted)]">
              {measured ? <>Mesure d’usage {since}.</> : 'Aucune mesure enregistrée pour l’instant.'}
            </p>
          )}
        </div>
        <div role="group" aria-label="Période" className="flex items-center gap-1 rounded-full bg-[var(--color-bg)] p-1" style={{ border: '1px solid var(--color-border)' }}>
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={cn('rounded-full px-3 py-1.5 text-[13px] font-medium', days === period ? 'text-white' : 'text-[var(--color-muted)]')}
              style={days === period ? { background: 'var(--color-primary)' } : undefined}
            >
              {period} j
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="card p-4 text-[14px] text-[var(--color-danger)]">
          {error.error}
          {(error.code ?? error.detail) && (
            <span className="mt-1 block text-[12px] text-[var(--color-muted)]">
              {[error.code, error.detail].filter(Boolean).join(' — ')}
            </span>
          )}
        </p>
      )}
      {!error && !data && <p className="text-[14px] text-[var(--color-muted)]">Chargement…</p>}

      {data && kpis && (
        <>
          <KpiGrid kpis={kpis} days={days} since={since} />

          {/* WHY: deux graphiques séparés plutôt qu’un seul à deux séries — « tableaux créés » et
              « événements » n’ont pas du tout la même échelle, les superposer écraserait le premier. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeeklyChart weeks={weeks} metric="boardsCreated" title="Tableaux créés par semaine" />
            <WeeklyChart weeks={weeks} metric="events" title="Actions par semaine" />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold text-[var(--color-primary)]">Par tableau</h2>
            <p className="mb-3 text-[13px] text-[var(--color-muted)]">
              {measured ? (
                <>
                  Sessions et clics portent sur {days} jours et n’existent que {since} ; les candidatures et
                  la dernière utilisation remontent avant la mesure.
                </>
              ) : (
                <>
                  Sessions et clics n’ont encore rien enregistré ; les candidatures et la dernière
                  utilisation, elles, remontent avant la mesure.
                </>
              )}
            </p>
            <BoardTable boards={data.boards} now={now} />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold text-[var(--color-primary)]">Entonnoir</h2>
            {/* WHY: « Revenu un autre jour » ne peut être vrai que pour un tableau mesuré depuis
                sa création — l’entonnoir ne porte donc que sur cette population, jamais sur
                l’ensemble des tableaux. La page affiche partout ailleurs l’effectif à côté des
                parts ; même règle ici. */}
            <p className="mb-3 text-[13px] text-[var(--color-muted)]">
              {measured
                ? funnelEligible > 0
                  ? <>Porte sur les {funnelEligible} tableaux créés {since} ; les tableaux plus anciens ne peuvent pas être mesurés sur toutes les étapes.</>
                  : <>Aucun tableau créé {since} : pas encore de population à mesurer sur les quatre étapes.</>
                : 'Aucune mesure enregistrée pour l’instant : pas encore de population à mesurer.'}
            </p>
            <FunnelBars steps={funnel} />
          </div>
        </>
      )}
    </div>
  )
}
