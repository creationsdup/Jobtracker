import { Target } from 'lucide-react'
import type { ScoreCriterion } from '@/hooks/useGoals'
import { scoreTierColor } from '@/utils/statusLabels'

interface GoalBadgeProps {
  score: number
  criteria?: ScoreCriterion[]
}

export function GoalBadge({ score, criteria }: GoalBadgeProps) {
  const { fg: color, bg } = scoreTierColor(score)

  const tooltip = criteria && criteria.length > 0
    ? [
        `${score}% — ${criteria.filter((c) => c.matched).length}/${criteria.length} critères atteints :`,
        ...criteria.map((c) => `${c.matched ? '✓' : '✗'} ${c.label}`),
      ].join('\n')
    : 'Alignement avec votre objectif de recherche'

  return (
    <span
      className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ color, background: bg }}
      title={tooltip}
    >
      <Target size={8} />
      {score}%
    </span>
  )
}
