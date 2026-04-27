import { cn } from '@/lib/utils'
import { STATUS_LABELS, type ApplicationStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', `badge-${status}`, className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}
