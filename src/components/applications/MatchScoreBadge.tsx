import { Target } from 'lucide-react'
import type { MatchResult } from '@/types/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'

interface MatchScoreBadgeProps {
  result: MatchResult
  onClick?: () => void
}

export function MatchScoreBadge({ result, onClick }: MatchScoreBadgeProps) {
  const { fg: color, bg } = matchLevelColor(result.level)

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
      style={{ color, background: bg }}
      title={`${result.totalScore}% — ${result.level}`}
    >
      <Target size={8} />
      {result.totalScore}% {result.level}
    </button>
  )
}
