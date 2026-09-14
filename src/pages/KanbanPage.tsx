// src/pages/KanbanPage.tsx
// Kanban avec glisser-déposer via @dnd-kit : une carte lâchée change de colonne tout de suite,
// l'enregistrement Supabase suit en arrière-plan.
import {
  DndContext, DragOverlay, PointerSensor, defaultDropAnimationSideEffects, pointerWithin, rectIntersection,
  useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent, type DropAnimation,
} from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { KanbanCard, KanbanCardOverlay } from '@/components/applications/KanbanCard'
import { EmptyDropZone } from '@/components/ui/EmptyDropZone'
import { applyPendingMoves, resolveDropStatus, settlePendingMoves, withMove, withoutMove, type PendingMoves } from '@/lib/kanbanDrag'
import type { Application, ApplicationStatus, UserGoal } from '@/lib/types'
import { KANBAN_COLUMNS, STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

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

// WHY: seules les colonnes reçoivent une carte ; on vise celle sous le pointeur, sinon la plus proche.
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : rectIntersection(args)
}

// La copie soulevée vient se poser dans la nouvelle colonne pendant que la carte réelle reste masquée.
const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0' } },
    className: { dragOverlay: 'kanban-overlay-dropping' },
  }),
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const tint = COLUMN_TINT[status]

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-3 w-[82vw] sm:w-[270px] min-w-[230px] sm:min-w-[270px] flex-shrink-0 snap-start rounded-[var(--radius-lg)] p-2.5 transition-shadow duration-150"
      style={{
        background: tint.bg,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        boxShadow: isOver ? `inset 0 0 0 2px ${tint.accent}` : undefined,
      }}
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

      <div className="flex flex-col gap-2 min-h-[80px]">
        {apps.map(app => (
          <KanbanCard key={app.id} app={app} goal={goal} onOpen={() => onOpen(app)} logoUrl={resolveLogo(app.company)} />
        ))}
        {apps.length === 0 && <EmptyDropZone />}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function KanbanPage({ applications, goal, onStatusChange, onOpenDetail, resolveLogo, standalone = true }: KanbanPageProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dragError, setDragError] = useState<string | null>(null)
  const [pendingMoves, setPendingMoves] = useState<PendingMoves>({})
  const [reducedMotion] = useState(prefersReducedMotion)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // WHY: une carte lâchée s'affiche aussitôt dans sa nouvelle colonne, sans attendre la réponse de Supabase.
  const displayed = useMemo(() => applyPendingMoves(applications, pendingMoves), [applications, pendingMoves])

  useEffect(() => {
    setPendingMoves((prev) => settlePendingMoves(prev, applications))
  }, [applications])

  const visibleApplications = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return displayed
    return displayed.filter((a) => a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q))
  }, [displayed, search])

  const grouped = KANBAN_COLUMNS.reduce<Record<ApplicationStatus, Application[]>>((acc, col) => {
    acc[col] = visibleApplications.filter(a => a.status === col)
    return acc
  }, {} as Record<ApplicationStatus, Application[]>)

  const activeApp = activeId ? displayed.find((a) => a.id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const draggedId = String(event.active.id)
    const targetStatus = resolveDropStatus(event.over?.id, displayed)
    const dragged = displayed.find((a) => a.id === draggedId)
    if (!targetStatus || !dragged || dragged.status === targetStatus) return

    setDragError(null)
    setPendingMoves((prev) => withMove(prev, draggedId, targetStatus))
    onStatusChange(draggedId, targetStatus).then((err) => {
      if (!err) return
      setPendingMoves((prev) => withoutMove(prev, draggedId))
      setDragError(err)
    })
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

      {dragError && (
        <p className="text-sm text-red-500">{dragError}</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/* WHY: l'aimantation du défilement contrarie le défilement automatique pendant le glisser. */}
        <div className={cn('flex gap-4 pb-4 overflow-x-auto', activeApp ? 'snap-none' : 'snap-x snap-mandatory')}>
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

        <DragOverlay dropAnimation={reducedMotion ? null : DROP_ANIMATION}>
          {activeApp && (
            <KanbanCardOverlay app={activeApp} goal={goal} logoUrl={resolveLogo(activeApp.company)} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
