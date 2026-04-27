import { MapPin, FileText } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate, getInitial } from '@/lib/utils'
import type { Application } from '@/lib/types'

interface ApplicationCardProps {
  application: Application
  onClick: () => void
}

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const { company, position, location, contractType, status, createdAt } = application

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
        <span className="text-xs text-[var(--color-muted)]">{formatDate(createdAt)}</span>
      </div>
    </div>
  )
}
