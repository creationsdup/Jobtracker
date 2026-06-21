import { cn } from '@/lib/utils'
import { STATUS_LABELS as TYPE_LABELS } from '@/lib/types'
import { STATUS_BADGE_CLASS } from '@/utils/statusLabels'
import type { ApplicationStatus } from '@/lib/types'
import type { StatusKey } from '@/utils/statusLabels'

const STATUS_KEY_MAP: Record<ApplicationStatus, StatusKey> = {
  WISHLIST:       'wishlist',
  APPLIED:        'applied',
  PHONE_SCREEN:   'applied',
  INTERVIEW:      'interview',
  TECHNICAL_TEST: 'interview',
  OFFER:          'offer',
  ACCEPTED:       'offer',
  REJECTED:       'rejected',
  WITHDRAWN:      'rejected',
}

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = STATUS_KEY_MAP[status]

  return (
    <span className={cn('badge', STATUS_BADGE_CLASS[key], className)}>
      {TYPE_LABELS[status]}
    </span>
  )
}
