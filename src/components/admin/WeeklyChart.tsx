import type { WeekRow } from '@/lib/adminStats'

interface WeeklyChartProps {
  weeks: WeekRow[]
  metric: 'boardsCreated' | 'events' | 'clicks'
  title: string
}

const WIDTH = 640
const HEIGHT = 150
const PAD_TOP = 10
const PAD_BOTTOM = 24
// WHY (dataviz): une colonne ne remplit jamais sa case — 24px de large au maximum, l’air
// autour est ce qui la rend lisible face à ses voisines.
const MAX_BAR_WIDTH = 24
// WHY (dataviz): un espacement de surface de 2px sépare deux colonnes qui se touchent,
// plutôt qu’un contour qui ajouterait de l’encre qui n’est pas de la donnée.
const BAR_GAP = 2
// WHY (dataviz): coin arrondi 4px côté donnée, carré à la ligne de base — jamais un
// rectangle arrondi sur les quatre coins.
const CORNER_RADIUS = 4

function labelFor(start: string): string {
  return new Date(`${start}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function WeeklyChart({ weeks, metric, title }: WeeklyChartProps) {
  const values = weeks.map((week) => week[metric])
  const max = Math.max(1, ...values)
  const plot = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = weeks.length === 0 ? WIDTH : WIDTH / weeks.length
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(2, slot - BAR_GAP))
  // WHY: une étiquette toutes les n semaines, sinon elles se chevauchent au-delà d’un trimestre.
  const labelEvery = Math.max(1, Math.ceil(weeks.length / 8))

  return (
    <div className="card p-4">
      {/* WHY (dataviz): une seule série n’a pas besoin de légende — le titre dit déjà ce qui
          est tracé ; une pastille unique redirait juste le titre. */}
      <p className="mb-3 text-[13px] font-semibold text-[var(--color-ink)]">{title}</p>
      {weeks.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted)]">Rien à afficher pour l’instant.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={title}>
          <line x1={0} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH} y2={HEIGHT - PAD_BOTTOM} stroke="var(--color-border)" strokeWidth={1} />
          {weeks.map((week, index) => {
            const value = week[metric]
            const height = Math.max(0, (value / max) * plot)
            const x = index * slot + (slot - barWidth) / 2
            const y = HEIGHT - PAD_BOTTOM - height
            // WHY: un rectangle plein `rx` arrondirait aussi le pied de colonne, sur la ligne
            // de base — on arrondit seulement le haut en superposant un carré sur le bas.
            const roundedTopOnly = height >= CORNER_RADIUS
            return (
              <g key={week.start}>
                <rect x={x} y={y} width={barWidth} height={height} rx={roundedTopOnly ? CORNER_RADIUS : 0} fill="var(--color-primary)" />
                {roundedTopOnly && (
                  <rect x={x} y={HEIGHT - PAD_BOTTOM - CORNER_RADIUS} width={barWidth} height={CORNER_RADIUS} fill="var(--color-primary)" />
                )}
                <title>{`Semaine du ${labelFor(week.start)} : ${value}`}</title>
                {index % labelEvery === 0 && (
                  <text
                    x={index * slot + slot / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-muted)"
                  >
                    {labelFor(week.start)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
