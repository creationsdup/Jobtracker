import { useState } from 'react'
import { MapPin, FileText } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { CompanyLogo } from './CompanyLogo'
import { MatchScoreBadge } from './MatchScoreBadge'
import { MatchDetailsModal } from './MatchDetailsModal'
import { formatDate } from '@/lib/utils'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import type { Application, UserGoal } from '@/lib/types'

interface ApplicationCardProps {
  application: Application
  goal?: UserGoal | null
  onClick: () => void
  logoUrl?: string
}

export function ApplicationCard({ application, goal, onClick, logoUrl }: ApplicationCardProps) {
  const { company, position, location, contractType, status, createdAt } = application
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(application), goal) : null
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className="card px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:-translate-y-px"
      style={{ borderColor: 'var(--color-border)' }}
      onClick={onClick}
    >
      <CompanyLogo company={company} logoUrl={logoUrl} size={40} />

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
          {match && <MatchScoreBadge result={match} onClick={() => setShowDetails(true)} />}
          <span className="text-xs text-[var(--color-muted)]">{formatDate(createdAt)}</span>
        </div>
      </div>

      {showDetails && match && <MatchDetailsModal result={match} onClose={() => setShowDetails(false)} />}
    </div>
  )
}
