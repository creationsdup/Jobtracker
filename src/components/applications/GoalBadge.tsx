import { Target } from 'lucide-react'
import type { ScoreCriterion } from '@/hooks/useGoals'

interface GoalBadgeProps {
  score: number
  criteria?: ScoreCriterion[]
}

export function GoalBadge({ score, criteria }: GoalBadgeProps) {
  const color = score >= 75 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
  const bg    = score >= 75 ? '#d1fae5' : score >= 40 ? '#fef3c7' : '#fee2e2'

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
