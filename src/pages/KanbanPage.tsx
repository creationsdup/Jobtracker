// src/pages/KanbanPage.tsx
// Kanban avec drag & drop via @dnd-kit
// Installation requise : npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { computeAppScore, computeAppScoreBreakdown } from '@/hooks/useGoals'
import { GoalBadge } from '@/components/applications/GoalBadge'
import { CompanyLogo } from '@/components/applications/CompanyLogo'
import { EmptyDropZone } from '@/components/ui/EmptyDropZone'
import type { Application, ApplicationStatus, UserGoal } from '@/lib/types'
import { KANBAN_COLUMNS, STATUS_LABELS } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanPageProps {
  applications: Application[]
  goal?: UserGoal | null
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<string | null>
  onOpenDetail: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
  /** Affiche le titre de page + la barre de recherche (désactivé quand intégré dans une autre page) */
  standalone?: boolean
}

const COLUMN_TINT: Record<ApplicationStatus, { bg: string; accent: string }> = {
  WISHLIST:       { bg: 'var(--color-bg-light)',         accent: 'var(--color-muted)' },
  APPLIED:        { bg: 'var(--color-cerulean-light)',   accent: 'var(--color-accent)' },
  PHONE_SCREEN:   { bg: 'var(--color-cerulean-light)',   accent: 'var(--color-accent)' },
  INTERVIEW:      { bg: 'var(--color-amber-light)',      accent: 'var(--color-warning)' },
  TECHNICAL_TEST: { bg: 'var(--color-amber-light)',      accent: 'var(--color-warning)' },
  OFFER:          { bg: 'var(--color-green-light)',      accent: 'var(--color-success)' },
  ACCEPTED:       { bg: 'var(--color-green-light)',      accent: 'var(--color-success)' },
  REJECTED:       { bg: 'var(--color-red-light)',        accent: 'var(--color-danger)' },
  WITHDRAWN:      { bg: 'var(--color-red-light)',        accent: 'var(--color-danger)' },
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function SortableCard({ app, goal, onOpen, logoUrl }: { app: Application; goal?: UserGoal | null; onOpen: () => void; logoUrl?: string }) {
  const score = computeAppScore(goal ?? null, app)
  const scoreCriteria = computeAppScoreBreakdown(goal ?? null, app)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: '#ffffff',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        boxShadow: 'var(--shadow-soft)',
      }}
      {...attributes}
      {...listeners}
      className="rounded-[var(--radius-lg)] px-3.5 py-3.5 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-[var(--shadow-md)]"
      onClick={onOpen}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo company={app.company} logoUrl={logoUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug text-[var(--color-text)] break-words" title={app.position}>{app.position}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1 truncate" title={app.company}>{app.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-[var(--color-muted)]">
        <span className="truncate">{app.location ?? '—'}</span>
        {app.appliedAt && (
          <>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0 whitespace-nowrap">{formatDate(app.appliedAt)}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {score !== null ? <GoalBadge score={score} criteria={scoreCriteria} /> : <span />}
        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-accent)' }}>Voir →</span>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  status, apps, goal, onOpen, resolveLogo,
}: {
  status: ApplicationStatus
  apps: Application[]
  goal?: UserGoal | null
  onOpen: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}) {
  const { setNodeRef } = useDroppable({ id: status })
  const tint = COLUMN_TINT[status]

  return (
    <div
      className="flex flex-col gap-3 w-[270px] min-w-[270px] flex-shrink-0 rounded-[var(--radius-lg)] p-2.5"
      style={{ background: tint.bg, border: '1px solid rgba(148, 163, 184, 0.18)' }}
    >
      <div
        className="px-3.5 py-2.5 flex items-center justify-between rounded-[12px] bg-white"
        style={{ border: '1px solid rgba(148, 163, 184, 0.2)' }}
      >
        <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tint.accent }} />
          {STATUS_LABELS[status]}
        </span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
          style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}
        >{apps.length}</span>
      </div>

      <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-2.5 min-h-[80px]">
          {apps.map(app => (
            <SortableCard key={app.id} app={app} goal={goal} onOpen={() => onOpen(app)} logoUrl={resolveLogo(app.company)} />
          ))}
          {apps.length === 0 && <EmptyDropZone />}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function KanbanPage({ applications, goal, onStatusChange, onOpenDetail, resolveLogo, standalone = true }: KanbanPageProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [search, setSearch] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const visibleApplications = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return applications
    return applications.filter((a) => a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q))
  }, [applications, search])

  const grouped = KANBAN_COLUMNS.reduce<Record<ApplicationStatus, Application[]>>((acc, col) => {
    acc[col] = visibleApplications.filter(a => a.status === col)
    return acc
  }, {} as Record<ApplicationStatus, Application[]>)

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find(a => a.id === event.active.id)
    setActiveApp(app ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null)
    const { active, over } = event
    if (!over) return

    // Find target column — `over.id` can be a card id or a column status
    const targetStatus = KANBAN_COLUMNS.find(col => col === over.id)
      ?? applications.find(a => a.id === over.id)?.status

    if (!targetStatus) return
    const draggedApp = applications.find(a => a.id === active.id)
    if (!draggedApp || draggedApp.status === targetStatus) return

    // Optimistic update — fire and forget
    onStatusChange(draggedApp.id, targetStatus)
  }

  return (
    <div className="flex flex-col gap-4">
      {standalone && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Pipeline</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Vue kanban de votre avancement</p>
          </div>
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
            <input
              className="input pl-9"
              placeholder="Rechercher une candidature..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4 overflow-x-auto">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col}
              status={col}
              apps={grouped[col] ?? []}
              goal={goal}
              onOpen={onOpenDetail}
              resolveLogo={resolveLogo}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp && (
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 shadow-xl opacity-90 rotate-1 cursor-grabbing flex items-start gap-3">
              <CompanyLogo company={activeApp.company} logoUrl={resolveLogo(activeApp.company)} size={32} />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{activeApp.position}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{activeApp.company}</p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
