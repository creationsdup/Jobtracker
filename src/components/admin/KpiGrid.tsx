import { formatDuration, formatShare, type Kpis } from '@/lib/adminStats'

interface KpiGridProps {
  kpis: Kpis
  days: number
  since: string
}

interface Tile {
  label: string
  value: string
  hint?: string
}

function tilesFor(kpis: Kpis, days: number, since: string): Tile[] {
  return [
    { label: 'Tableaux', value: String(kpis.boardsTotal), hint: `dont ${kpis.boardsCreatedInPeriod} créé(s) sur ${days} j` },
    { label: 'Actifs 7 j', value: String(kpis.active7), hint: `${kpis.active30} sur 30 j` },
    { label: 'Dormants', value: String(kpis.dormant), hint: 'créés il y a plus de 30 j, inactifs depuis 30 j' },
    { label: 'Extension', value: String(kpis.extensionBoards), hint: `${formatShare(kpis.extensionShare)} des tableaux · ${since}` },
    { label: 'Candidatures', value: String(kpis.applicationsTotal), hint: `moyenne ${kpis.applicationsMean} · médiane ${kpis.applicationsMedian}` },
    { label: 'Clics par session', value: String(kpis.clicksMedian), hint: `médiane · moyenne ${kpis.clicksMean} · ${since}` },
    { label: 'Durée d’une session', value: formatDuration(kpis.sessionSecondsMedian), hint: `médiane · ${since}` },
    { label: 'Sessions par tableau', value: String(kpis.sessionsPerActiveBoardMean), hint: `moyenne sur les tableaux actifs · ${since}` },
    {
      label: 'Rétention 7 j',
      value: kpis.retention7.eligible === 0 ? '—' : formatShare(kpis.retention7.share),
      hint: kpis.retention7.eligible === 0
        ? 'aucun tableau assez ancien depuis le début de la mesure'
        : `${kpis.retention7.returned} sur ${kpis.retention7.eligible} tableaux`,
    },
  ]
}

export function KpiGrid({ kpis, days, since }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tilesFor(kpis, days, since).map((tile) => (
        <div key={tile.label} className="card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{tile.label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-[var(--color-primary)]">{tile.value}</p>
          {/* WHY: l’effectif est toujours affiché à côté d’un pourcentage — sur quelques dizaines
              de tableaux, « 38 % » sans « 3 sur 8 » donne une fausse impression de précision. */}
          {tile.hint && <p className="mt-1.5 text-[12px] leading-snug text-[var(--color-muted)]">{tile.hint}</p>}
        </div>
      ))}
    </div>
  )
}
