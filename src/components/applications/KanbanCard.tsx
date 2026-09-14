import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { formatDate, cn } from '@/lib/utils'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import { MatchScoreBadge } from '@/components/applications/MatchScoreBadge'
import { MatchDetailsModal } from '@/components/applications/MatchDetailsModal'
import { CompanyLogo } from '@/components/applications/CompanyLogo'
import type { Application, UserGoal } from '@/lib/types'

type JobMatch = ReturnType<typeof calculateJobMatch>

const CARD_FRAME = 'rounded-[var(--radius-lg)] px-2.5 py-2 select-none'
const noop = () => {}

function KanbanCardContent({ app, logoUrl, match, onMatchClick }: { app: Application; logoUrl?: string; match: JobMatch | null; onMatchClick?: () => void }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <CompanyLogo company={app.company} logoUrl={logoUrl} size={24} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[13px] leading-snug text-[var(--color-text)] break-words" title={app.position}>{app.position}</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5 truncate" title={app.company}>{app.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--color-muted)]">
        <span className="truncate">{app.location ?? '—'}</span>
        {app.appliedAt && (
          <>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0 whitespace-nowrap">{formatDate(app.appliedAt)}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-[var(--color-border)]">
        {match ? <MatchScoreBadge result={match} onClick={onMatchClick ?? noop} /> : <span />}
        <span className="text-[11px] font-semibold text-[var(--color-accent)]">Voir →</span>
      </div>
    </>
  )
}

interface KanbanCardProps {
  app: Application
  goal?: UserGoal | null
  logoUrl?: string
  onOpen: () => void
}

/** Carte du kanban, à sa place dans la colonne. */
export function KanbanCard({ app, goal, logoUrl, onOpen }: KanbanCardProps) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
  const [showDetails, setShowDetails] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        CARD_FRAME,
        'border cursor-grab active:cursor-grabbing transition-shadow',
        isDragging
          ? 'border-dashed border-[var(--color-border-hover)] bg-white/50'
          : 'bg-white border-[rgba(148,163,184,0.25)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-md)]',
      )}
    >
      {/* WHY: pendant le glisser, la carte garde sa place (même hauteur) en pointillés ; c'est la copie soulevée qui suit le pointeur. */}
      <div className={cn(isDragging && 'invisible')}>
        <KanbanCardContent app={app} logoUrl={logoUrl} match={match} onMatchClick={() => setShowDetails(true)} />
      </div>
      {showDetails && match && <MatchDetailsModal result={match} onClose={() => setShowDetails(false)} />}
    </div>
  )
}

/** Copie de la carte qui suit le pointeur : identique à la carte, légèrement soulevée. */
export function KanbanCardOverlay({ app, goal, logoUrl }: Omit<KanbanCardProps, 'onOpen'>) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
  const [lifted, setLifted] = useState(false)

  // WHY: passer à l'état soulevé juste après le premier affichage pour que la transition CSS se joue.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLifted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div data-lifted={lifted} className={cn(CARD_FRAME, 'kanban-lift h-full bg-white border border-[rgba(148,163,184,0.25)] cursor-grabbing')}>
      <KanbanCardContent app={app} logoUrl={logoUrl} match={match} />
    </div>
  )
}
