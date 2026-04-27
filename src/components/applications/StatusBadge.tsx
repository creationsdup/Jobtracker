import { cn } from '@/lib/utils'
import { STATUS_LABELS, type ApplicationStatus } from '@/lib/types'

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  WISHLIST:       'bg-gray-100 text-gray-700',
  APPLIED:        'bg-blue-100 text-blue-700',
  PHONE_SCREEN:   'bg-purple-100 text-purple-700',
  INTERVIEW:      'bg-orange-100 text-orange-700',
  TECHNICAL_TEST: 'bg-yellow-100 text-yellow-700',
  OFFER:          'bg-green-100 text-green-700',
  ACCEPTED:       'bg-emerald-100 text-emerald-700',
  REJECTED:       'bg-red-100 text-red-700',
  WITHDRAWN:      'bg-gray-100 text-gray-500',
}

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}
