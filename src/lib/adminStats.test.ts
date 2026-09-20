import { describe, expect, it } from 'vitest'
import {
  computeFunnel, computeKpis, formatDuration, formatShare, formatSince, mean, median,
  relativeDays, shortBoardId, toWeeks, weekStart, type BoardRow, type DayRow, type SessionRow,
} from './adminStats'

const NOW = Date.parse('2026-09-20T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

function board(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    user_id: '11111111-2222-3333-4444-555555555555',
    created_at: daysAgo(40),
    last_seen_at: daysAgo(1),
    sessions: 3,
    clicks: 30,
    applications: 4,
    active_days: 3,
    returned_within_7d: true,
    has_extension: false,
    secured: false,
    ...overrides,
  }
}

describe('mean et median', () => {
  it("rendent 0 sur une liste vide", () => {
    expect(mean([])).toBe(0)
    expect(median([])).toBe(0)
  })

  it("calculent la moyenne arrondie au dixième", () => {
    expect(mean([1, 2, 4])).toBe(2.3)
  })

  it("prennent la valeur du milieu, ou la moyenne des deux valeurs centrales", () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('computeKpis', () => {
  const sessions: SessionRow[] = [
    { user_id: 'a', clicks: 10, duration_s: 60, occurred_at: daysAgo(1) },
    { user_id: 'a', clicks: 20, duration_s: 120, occurred_at: daysAgo(2) },
    { user_id: 'b', clicks: 30, duration_s: 600, occurred_at: daysAgo(3) },
  ]

  it("compte les tableaux, ceux de la période, les actifs et les dormants", () => {
    const boards = [
      board({ created_at: daysAgo(3), last_seen_at: daysAgo(1) }),
      board({ created_at: daysAgo(60), last_seen_at: daysAgo(20) }),
      board({ created_at: daysAgo(90), last_seen_at: daysAgo(80) }),
    ]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.boardsTotal).toBe(3)
    expect(kpis.boardsCreatedInPeriod).toBe(1)
    expect(kpis.active7).toBe(1)
    expect(kpis.active30).toBe(2)
    expect(kpis.dormant).toBe(1)
  })

  it("donne moyenne ET médiane des candidatures, qu'un seul gros tableau ne doit pas écraser", () => {
    const boards = [board({ applications: 1 }), board({ applications: 2 }), board({ applications: 34 })]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.applicationsTotal).toBe(37)
    expect(kpis.applicationsMean).toBe(12.3)
    expect(kpis.applicationsMedian).toBe(2)
  })

  it("compte les tableaux ayant connecté l'extension et leur part", () => {
    const boards = [board({ has_extension: true }), board(), board(), board()]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis.extensionBoards).toBe(1)
    expect(kpis.extensionShare).toBe(0.25)
  })

  it("résume les sessions : clics et durée", () => {
    const kpis = computeKpis([board({ sessions: 2 }), board({ sessions: 4 })], sessions, { now: NOW, days: 30, measurementStart: null })
    expect(kpis.clicksMean).toBe(20)
    expect(kpis.clicksMedian).toBe(20)
    expect(kpis.sessionSecondsMedian).toBe(120)
    expect(kpis.sessionsPerActiveBoardMean).toBe(3)
  })

  it("ne retient pour la rétention que les tableaux nés après le début de la mesure et vieux de 7 jours", () => {
    const boards = [
      board({ created_at: daysAgo(2), returned_within_7d: true }),   // trop jeune
      board({ created_at: daysAgo(40), returned_within_7d: true }),  // avant la mesure
      board({ created_at: daysAgo(20), returned_within_7d: true }),
      board({ created_at: daysAgo(15), returned_within_7d: false }),
    ]
    const kpis = computeKpis(boards, [], { now: NOW, days: 30, measurementStart: daysAgo(30) })
    expect(kpis.retention7).toEqual({ eligible: 2, returned: 1, share: 0.5 })
  })

  it("ne divise jamais par zéro", () => {
    const kpis = computeKpis([], [], { now: NOW, days: 30, measurementStart: null })
    expect(kpis).toMatchObject({
      boardsTotal: 0, extensionShare: 0, applicationsMean: 0, clicksMedian: 0,
      sessionsPerActiveBoardMean: 0, retention7: { eligible: 0, returned: 0, share: 0 },
    })
  })
})

describe('computeFunnel', () => {
  it("rend quatre étapes décroissantes, en nombre et en part", () => {
    const boards = [
      board({ applications: 0, active_days: 1 }),
      board({ applications: 2, active_days: 1 }),
      board({ applications: 7, active_days: 3 }),
      board({ applications: 9, active_days: 5 }),
    ]
    expect(computeFunnel(boards)).toEqual([
      { label: 'Tableau créé', count: 4, share: 1 },
      { label: 'Au moins 1 candidature', count: 3, share: 0.75 },
      { label: 'Au moins 5 candidatures', count: 2, share: 0.5 },
      { label: 'Revenu un autre jour', count: 2, share: 0.5 },
    ])
  })

  it("rend des parts nulles sans aucun tableau", () => {
    expect(computeFunnel([])).toEqual([
      { label: 'Tableau créé', count: 0, share: 0 },
      { label: 'Au moins 1 candidature', count: 0, share: 0 },
      { label: 'Au moins 5 candidatures', count: 0, share: 0 },
      { label: 'Revenu un autre jour', count: 0, share: 0 },
    ])
  })
})

describe('toWeeks', () => {
  it("ramène chaque jour au lundi de sa semaine", () => {
    expect(weekStart("2026-09-20")).toBe("2026-09-14") // un dimanche
    expect(weekStart("2026-09-14")).toBe("2026-09-14") // un lundi
  })

  it("additionne les jours par semaine, du plus ancien au plus récent", () => {
    const days: DayRow[] = [
      { day: '2026-09-14', boards_created: 1, boards_active: 2, events: 10, clicks: 100 },
      { day: '2026-09-16', boards_created: 2, boards_active: 3, events: 5, clicks: 50 },
      { day: '2026-09-21', boards_created: 1, boards_active: 1, events: 7, clicks: 70 },
    ]
    expect(toWeeks(days)).toEqual([
      { start: '2026-09-14', boardsCreated: 3, events: 15, clicks: 150 },
      { start: '2026-09-21', boardsCreated: 1, events: 7, clicks: 70 },
    ])
  })
})

describe('mises en forme', () => {
  it("dit depuis quand la mesure existe", () => {
    expect(formatSince(null)).toBe("aucune mesure enregistrée pour l'instant")
    expect(formatSince("2026-09-20T08:00:00Z")).toBe("depuis le 20 septembre 2026")
  })

  it("écrit les durées en minutes et secondes", () => {
    expect(formatDuration(0)).toBe("0 s")
    expect(formatDuration(45)).toBe("45 s")
    expect(formatDuration(125)).toBe("2 min 05 s")
  })

  it("écrit les parts en pourcentage entier", () => {
    expect(formatShare(0)).toBe("0 %")
    expect(formatShare(0.375)).toBe("38 %")
  })

  it("raccourcit l'identifiant d'un tableau", () => {
    expect(shortBoardId("11111111-2222-3333-4444-555555555555")).toBe("11111111")
  })

  it("dit à quand remonte la dernière utilisation", () => {
    expect(relativeDays(daysAgo(0), NOW)).toBe("aujourd'hui")
    expect(relativeDays(daysAgo(1), NOW)).toBe("hier")
    expect(relativeDays(daysAgo(5), NOW)).toBe("il y a 5 j")
    expect(relativeDays(daysAgo(70), NOW)).toBe("il y a 2 mois")
  })
})
