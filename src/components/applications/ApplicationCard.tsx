import { MapPin, FileText, Target } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate, getInitial } from '@/lib/utils'
import { computeAppScore } from '@/hooks/useGoals'
import type { Application, UserGoal } from '@/lib/types'

interface ApplicationCardProps {
  application: Application
  goal?: UserGoal | null
  onClick: () => void
}

function GoalBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
  const bg    = score >= 75 ? '#d1fae5' : score >= 40 ? '#fef3c7' : '#fee2e2'
  return (
    <span
      className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ color, background: bg }}
      title="Alignement avec votre objectif de recherche"
    >
      <Target size={8} />
      {score}%
    </span>
  )
}

export function ApplicationCard({ application, goal, onClick }: ApplicationCardProps) {
  const { company, position, location, contractType, status, createdAt } = application
  const score = computeAppScore(goal ?? null, application)

  return (
    <div
      className="card px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-150 border border-transparent hover:shadow-[var(--shadow-md)] hover:-translate-y-px hover:border-[var(--color-border)]"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-base font-bold text-[var(--color-primary)] flex-shrink-0">
        {getInitial(company)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{position}</div>
        <div className="text-[var(--color-muted)] text-xs">{company}</div>
        {(location || contractType) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-muted)]">
            {location && <span className="flex items-center gap-1"><MapPin size={11} />{location}</span>}
            {contractType && <span className="flex items-center gap-1"><FileText size={11} />{contractType}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <StatusBadge status={status} />
        <div className="flex items-center gap-1.5">
          {score !== null && <GoalBadge score={score} />}
          <span className="text-xs text-[var(--color-muted)]">{formatDate(createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
