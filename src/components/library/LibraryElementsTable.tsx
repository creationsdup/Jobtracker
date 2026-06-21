import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Experience, CvDocument } from '@/lib/types'

interface TypeBadge {
  label: string
  color: string
}

interface LibraryElementsTableProps {
  items: Experience[]
  cvDocuments: CvDocument[]
  typeBadge: (exp: Experience) => TypeBadge
  onEdit: (exp: Experience) => void
  onDelete: (id: string) => Promise<string | null>
  emptyTitle: string
  emptyText: string
}

const VISIBLE_CAP = 5

export function LibraryElementsTable({
  items,
  cvDocuments,
  typeBadge,
  onEdit,
  onDelete,
  emptyTitle,
  emptyText,
}: LibraryElementsTableProps) {
  const [expanded, setExpanded] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="text-4xl mb-3">🗂️</div>
        <p className="font-semibold">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyText}</p>
      </div>
    )
  }

  function sourceLabel(exp: Experience): string {
    if (!exp.sourceCvId) return 'Saisie manuelle'
    return cvDocuments.find((cv) => cv.id === exp.sourceCvId)?.file_name ?? 'Saisie manuelle'
  }

  function dateRange(exp: Experience): string {
    return `${formatDate(exp.startDate)} — ${exp.current ? "aujourd'hui" : exp.endDate ? formatDate(exp.endDate) : ''}`
  }

  const visibleItems = expanded ? items : items.slice(0, VISIBLE_CAP)

  function actions(exp: Experience) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors hover:bg-blue-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
          onClick={() => onEdit(exp)}
        >
          <Pencil size={14} />
        </button>
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors hover:bg-red-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
          onClick={async () => {
            if (!window.confirm('Supprimer cette entrée ? Cette action est irréversible.')) return
            setDeleteError(null)
            const err = await onDelete(exp.id)
            if (err) setDeleteError(err)
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}

      {/* Desktop: table */}
      <div className="hidden md:block rounded-[14px] border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase text-[var(--color-muted)]" style={{ background: 'var(--color-bg)' }}>
            <th className="py-2.5 px-4">Élément</th>
            <th className="py-2.5 px-4">Type</th>
            <th className="py-2.5 px-4">Source</th>
            <th className="py-2.5 px-4">Dernière utilisation</th>
            <th className="py-2.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((exp) => {
            const badge = typeBadge(exp)
            return (
              <tr key={exp.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-3 px-4">
                  <p className="font-medium">{exp.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">{exp.organization} · {dateRange(exp)}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${badge.color}`}>{badge.label}</span>
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] truncate max-w-[180px]">{sourceLabel(exp)}</td>
                <td className="py-3 px-4 text-[var(--color-muted)] whitespace-nowrap">{formatDate(exp.createdAt)}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  {actions(exp)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {items.length > VISIBLE_CAP && (
        <button
          className="w-full py-3 text-sm font-medium border-t text-[var(--color-accent)] hover:bg-[var(--color-bg)] transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Réduire' : 'Voir tous les éléments'}
        </button>
      )}
      </div>

      {/* Mobile: vertical cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {visibleItems.map((exp) => {
          const badge = typeBadge(exp)
          return (
            <div key={exp.id} className="rounded-[14px] border p-3.5 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{exp.title}</p>
                  <p className="text-xs text-[var(--color-muted)] truncate">{exp.organization} · {dateRange(exp)}</p>
                </div>
                <span className={`badge ${badge.color} shrink-0`}>{badge.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span className="truncate">{sourceLabel(exp)} · {formatDate(exp.createdAt)}</span>
                {actions(exp)}
              </div>
            </div>
          )
        })}

        {items.length > VISIBLE_CAP && (
          <button
            className="w-full py-3 text-sm font-medium rounded-[14px] border text-[var(--color-accent)] hover:bg-[var(--color-bg)] transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Réduire' : 'Voir tous les éléments'}
          </button>
        )}
      </div>
    </div>
  )
}
