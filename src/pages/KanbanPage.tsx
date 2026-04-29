// src/pages/KanbanPage.tsx
// Kanban avec drag & drop via @dnd-kit
// Installation requise : npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/lib/types'
import { KANBAN_COLUMNS, STATUS_LABELS } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanPageProps {
  applications: Application[]
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<string | null>
  onOpenDetail: (app: Application) => void
  onAdd: () => void
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function SortableCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 shadow-[var(--shadow)] cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-[var(--shadow-md)]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight line-clamp-2">{app.position}</p>
          <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">{app.company}</p>
        </div>
        {app.appliedAt && (
          <p className="text-[10px] text-[var(--color-muted)] shrink-0 whitespace-nowrap">{formatDate(app.appliedAt)}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[var(--color-border)]">
        {app.location ? (
          <p className="text-[10px] text-[var(--color-muted)] truncate">{app.location}</p>
        ) : (
          <span className="text-[10px] text-[var(--color-muted)]">Sans lieu</span>
        )}
        <span className="text-[10px] font-medium text-[var(--color-muted)]">
          Ouvrir
        </span>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  status, apps, onOpen,
}: {
  status: ApplicationStatus
  apps: Application[]
  onOpen: (app: Application) => void
}) {
  const COLUMN_COLORS: Partial<Record<ApplicationStatus, string>> = {
    WISHLIST: 'border-t-slate-400',
    APPLIED: 'border-t-blue-400',
    INTERVIEW: 'border-t-amber-400',
    OFFER: 'border-t-green-400',
    REJECTED: 'border-t-red-400',
  }
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div className={`card border-t-2 ${COLUMN_COLORS[status] ?? 'border-t-gray-300'} px-3 py-2.5 flex items-center justify-between`}>
        <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded-full">{apps.length}</span>
      </div>

      <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[80px]">
          {apps.map(app => (
            <SortableCard key={app.id} app={app} onOpen={() => onOpen(app)} />
          ))}
          {apps.length === 0 && (
            <div className="rounded-[var(--radius)] border-2 border-dashed border-[var(--color-border)] h-20 flex items-center justify-center bg-[var(--color-surface)]">
              <p className="text-[11px] text-[var(--color-muted)]">Glissez ici</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function KanbanPage({ applications, onStatusChange, onOpenDetail, onAdd }: KanbanPageProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const grouped = KANBAN_COLUMNS.reduce<Record<ApplicationStatus, Application[]>>((acc, col) => {
    acc[col] = applications.filter(a => a.status === col)
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kanban</h2>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Candidature</button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4 min-w-0">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col}
              status={col}
              apps={grouped[col] ?? []}
              onOpen={onOpenDetail}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp && (
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 shadow-xl opacity-90 rotate-1 cursor-grabbing">
              <p className="font-semibold text-sm">{activeApp.position}</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">{activeApp.company}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
