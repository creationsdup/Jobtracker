import { Link } from 'react-router-dom'
import { BookOpen, Check } from 'lucide-react'
import { formatCVDate } from '@/utils/cvHelpers'
import type { Experience } from '@/lib/types'

interface Props {
  libraryItems: Experience[]
  selectedIds: string[]
  onToggle: (id: string) => void
  loading: boolean
}

export function ExperiencesEditor({ libraryItems, selectedIds, onToggle, loading }: Props) {
  const items = libraryItems.filter(e => e.type === 'WORK' || e.type === 'VOLUNTEER')

  if (loading) return <p className="text-[var(--color-muted)] text-sm py-4">Chargement…</p>

  if (items.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-[var(--color-muted)]">Aucune expérience dans la bibliothèque</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">Ajoutez vos expériences professionnelles dans l'onglet Expériences.</p>
        <Link to="/library" className="btn btn-secondary btn-sm">
          Aller à la bibliothèque →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-[var(--color-muted)]">
        {selectedIds.filter(id => items.some(i => i.id === id)).length} / {items.length} sélectionnée(s)
      </p>
      {items.map(exp => {
        const selected = selectedIds.includes(exp.id)
        return (
          <button
            key={exp.id}
            onClick={() => onToggle(exp.id)}
            className={`w-full text-left rounded-[var(--radius-sm)] border px-3 py-2.5 transition-all flex items-start gap-2.5 ${
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all ${
              selected ? 'bg-[var(--color-primary)]' : 'border border-gray-300'
            }`}>
              {selected && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-ink)] truncate">{exp.title}</p>
              <p className="text-[11px] text-[var(--color-muted)] truncate">{exp.organization}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatCVDate(exp.startDate)} – {exp.current ? 'Présent' : exp.endDate ? formatCVDate(exp.endDate) : ''}
                {exp.location ? ` · ${exp.location}` : ''}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
