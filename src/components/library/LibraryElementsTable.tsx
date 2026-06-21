import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Experience, CvDocument } from '@/lib/types'

interface LibraryElementsTableProps {
  items: Experience[]
  cvDocuments: CvDocument[]
  typeLabel: (exp: Experience) => string
  onEdit: (exp: Experience) => void
  onDelete: (id: string) => Promise<string | null>
  emptyTitle: string
  emptyText: string
}

export function LibraryElementsTable({
  items,
  cvDocuments,
  typeLabel,
  onEdit,
  onDelete,
  emptyTitle,
  emptyText,
}: LibraryElementsTableProps) {
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

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold uppercase text-[var(--color-muted)]">
          <th className="py-2">Élément</th>
          <th className="py-2">Type</th>
          <th className="py-2">Source</th>
          <th className="py-2">Dernière utilisation</th>
          <th className="py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((exp) => (
          <tr key={exp.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <td className="py-3">
              <p className="font-medium">{exp.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{exp.organization}</p>
            </td>
            <td className="py-3 text-[var(--color-muted)]">{typeLabel(exp)}</td>
            <td className="py-3 text-[var(--color-muted)] truncate max-w-[180px]">{sourceLabel(exp)}</td>
            <td className="py-3 text-[var(--color-muted)]">{formatDate(exp.createdAt)}</td>
            <td className="py-3 text-right">
              <button className="btn btn-ghost p-2" onClick={() => onEdit(exp)}><Pencil size={14} /></button>
              <button
                className="btn btn-ghost p-2 text-[var(--color-danger)]"
                onClick={async () => {
                  if (!window.confirm('Supprimer cette entrée ? Cette action est irréversible.')) return
                  await onDelete(exp.id)
                }}
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
