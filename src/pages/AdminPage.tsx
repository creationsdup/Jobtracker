import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchAdminData, type AdminData } from '@/lib/adminApi'
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
  const [error, setError] = useState<string | null>(null)
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
      if ('error' in result) setError(result.error)
      else { setData(result); setNow(Date.now()) }
    })
    return () => { alive = false }
  }, [days])
  const since = data ? formatSince(data.meta.measurement_start) : ''
  const kpis = useMemo(
    () => (data ? computeKpis(data.boards, data.sessions, { now, days, measurementStart: data.meta.measurement_start }) : null),
    [data, days, now],
  )
  const weeks = useMemo(() => (data ? toWeeks(data.days) : []), [data])
  const funnel = useMemo(() => (data ? computeFunnel(data.boards) : []), [data])

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <Link to="/mon-tableau" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-accent)] no-underline hover:underline">
        <ArrowLeft size={15} />
        Retour aux réglages
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-primary)]">Tableau de bord</h1>
          {data && <p className="text-[13px] text-[var(--color-muted)]">Mesure d’usage {since}.</p>}
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

      {error && <p className="card p-4 text-[14px] text-[var(--color-danger)]">{error}</p>}
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
              Sessions et clics portent sur {days} jours et n’existent que {since} ; les candidatures et la
              dernière utilisation remontent avant la mesure.
            </p>
            <BoardTable boards={data.boards} now={now} />
          </div>

          <div>
            <h2 className="mb-2 text-[17px] font-bold text-[var(--color-primary)]">Entonnoir</h2>
            <FunnelBars steps={funnel} />
          </div>
        </>
      )}
    </div>
  )
}
