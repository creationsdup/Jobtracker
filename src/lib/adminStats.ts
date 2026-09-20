/**
 * Calcul des chiffres du tableau de bord créateur. Module pur : les fonctions SQL renvoient des
 * lignes brutes, tout le reste (moyennes, médianes, parts, entonnoir, rétention) se calcule ici,
 * où c'est testable sans base.
 */

/** Une ligne de public.admin_boards(p_days). */
export interface BoardRow {
  user_id: string
  created_at: string
  last_seen_at: string
  sessions: number
  clicks: number
  applications: number
  active_days: number
  returned_within_7d: boolean
  has_extension: boolean
  secured: boolean
}

/** Une ligne de public.admin_sessions(p_days). */
export interface SessionRow {
  user_id: string
  clicks: number
  duration_s: number
  occurred_at: string
}

/** Une ligne de public.admin_timeseries(p_days). */
export interface DayRow {
  day: string
  boards_created: number
  boards_active: number
  events: number
  clicks: number
}

export interface Kpis {
  boardsTotal: number
  boardsCreatedInPeriod: number
  active7: number
  active30: number
  dormant: number
  extensionBoards: number
  extensionShare: number
  applicationsTotal: number
  applicationsMean: number
  applicationsMedian: number
  clicksMean: number
  clicksMedian: number
  sessionSecondsMedian: number
  sessionsPerActiveBoardMean: number
  retention7: { eligible: number; returned: number; share: number }
}

export interface FunnelStep {
  label: string
  count: number
  share: number
}

export interface WeekRow {
  start: string
  boardsCreated: number
  events: number
  clicks: number
}

const DAY_MS = 86_400_000

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole
}

export function computeKpis(
  boards: BoardRow[],
  sessions: SessionRow[],
  options: { now: number; days: number; measurementStart: string | null },
): Kpis {
  const { now, days, measurementStart } = options
  const since = now - days * DAY_MS
  const start = measurementStart === null ? null : Date.parse(measurementStart)

  const seenAfter = (row: BoardRow, cutoff: number) => Date.parse(row.last_seen_at) >= cutoff
  const createdBefore = (row: BoardRow, cutoff: number) => Date.parse(row.created_at) < cutoff

  // WHY: n'entrent dans la rétention que les tableaux nés APRÈS le début de la mesure — pour les
  // plus anciens, l'absence d'événement ne veut pas dire qu'ils ne sont pas revenus (spec §6).
  const eligible = start === null
    ? []
    : boards.filter((row) => Date.parse(row.created_at) >= start && createdBefore(row, now - 7 * DAY_MS))
  const returned = eligible.filter((row) => row.returned_within_7d)

  const withSessions = boards.filter((row) => row.sessions > 0)

  return {
    boardsTotal: boards.length,
    boardsCreatedInPeriod: boards.filter((row) => Date.parse(row.created_at) >= since).length,
    active7: boards.filter((row) => seenAfter(row, now - 7 * DAY_MS)).length,
    active30: boards.filter((row) => seenAfter(row, now - 30 * DAY_MS)).length,
    dormant: boards.filter((row) => createdBefore(row, now - 30 * DAY_MS) && !seenAfter(row, now - 30 * DAY_MS)).length,
    extensionBoards: boards.filter((row) => row.has_extension).length,
    extensionShare: share(boards.filter((row) => row.has_extension).length, boards.length),
    applicationsTotal: boards.reduce((total, row) => total + row.applications, 0),
    applicationsMean: mean(boards.map((row) => row.applications)),
    applicationsMedian: median(boards.map((row) => row.applications)),
    clicksMean: mean(sessions.map((row) => row.clicks)),
    clicksMedian: median(sessions.map((row) => row.clicks)),
    sessionSecondsMedian: median(sessions.map((row) => row.duration_s)),
    sessionsPerActiveBoardMean: mean(withSessions.map((row) => row.sessions)),
    retention7: { eligible: eligible.length, returned: returned.length, share: share(returned.length, eligible.length) },
  }
}

export function computeFunnel(boards: BoardRow[]): FunnelStep[] {
  const total = boards.length
  const steps: [string, (row: BoardRow) => boolean][] = [
    ['Tableau créé', () => true],
    ['Au moins 1 candidature', (row) => row.applications >= 1],
    ['Au moins 5 candidatures', (row) => row.applications >= 5],
    ['Revenu un autre jour', (row) => row.active_days >= 2],
  ]
  return steps.map(([label, matches]) => {
    const count = boards.filter(matches).length
    return { label, count, share: share(count, total) }
  })
}

/** Lundi de la semaine d'un jour « AAAA-MM-JJ », en UTC pour ne pas dépendre du fuseau. */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const weekday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - weekday)
  return date.toISOString().slice(0, 10)
}

export function toWeeks(days: DayRow[]): WeekRow[] {
  const weeks = new Map<string, WeekRow>()
  for (const day of days) {
    const start = weekStart(day.day)
    const week = weeks.get(start) ?? { start, boardsCreated: 0, events: 0, clicks: 0 }
    week.boardsCreated += day.boards_created
    week.events += day.events
    week.clicks += day.clicks
    weeks.set(start, week)
  }
  // WHY: boards_active n'est PAS additionné : un même tableau actif deux jours compterait deux
  // fois. Le nombre d'actifs exact reste dans les chiffres clés (actifs 7 j / 30 j).
  return [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start))
}

export function formatSince(measurementStart: string | null): string {
  if (measurementStart === null) return "aucune mesure enregistrée pour l'instant"
  const date = new Date(measurementStart)
  return `depuis le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${String(Math.round(seconds % 60)).padStart(2, '0')} s`
}

export function formatShare(value: number): string {
  return `${Math.round(value * 100)} %`
}

export function shortBoardId(userId: string): string {
  return userId.slice(0, 8)
}

export function relativeDays(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY_MS)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 60) return `il y a ${days} j`
  return `il y a ${Math.floor(days / 30)} mois`
}
