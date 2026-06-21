import { useEffect, useRef, useState } from 'react'
import { FileText, Eye, Download, MoreVertical, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CV_STATUS_LABELS, type CvDocument, type CvStatus } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface CvCardProps {
  cv: CvDocument
  onOpen: (cv: CvDocument) => void
  onDownload: (cv: CvDocument) => void
  onReanalyze: (cv: CvDocument) => Promise<void>
  onSetStatus: (id: string, status: CvStatus) => void
  onDelete: (id: string) => void
}

const STATUS_BADGE_CLASS: Record<CvStatus, string> = {
  active: 'bg-green-100 text-green-700',
  to_review: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-600',
}

export function CvCard({ cv, onOpen, onDownload, onReanalyze, onSetStatus, onDelete }: CvCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-3 py-3 bg-white/72"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <FileText size={20} className="text-[var(--color-muted)] shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-[var(--color-deep-space)]">{cv.file_name}</p>
        <p className="text-xs text-[var(--color-muted)]">Mis à jour le {formatDate(cv.updated_at)}</p>
      </div>

      {cv.ats_score !== null ? <ScoreRing score={cv.ats_score} size={36} /> : (
        <span className="text-xs text-[var(--color-muted)] w-9 text-center">—</span>
      )}

      <span className={`badge ${STATUS_BADGE_CLASS[cv.status]}`}>{CV_STATUS_LABELS[cv.status]}</span>

      <button className="btn btn-ghost p-2" title="Ouvrir" onClick={() => onOpen(cv)}>
        <Eye size={15} />
      </button>
      <button className="btn btn-ghost p-2" title="Télécharger" onClick={() => onDownload(cv)}>
        <Download size={15} />
      </button>

      <div ref={menuRef} className="relative">
        <button className="btn btn-ghost p-2" onClick={() => setMenuOpen((v) => !v)}>
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-44 bg-white rounded-[10px] border shadow-lg z-10"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] flex items-center gap-2 disabled:opacity-50"
              disabled={reanalyzing}
              onClick={async () => {
                setReanalyzing(true)
                await onReanalyze(cv)
                setReanalyzing(false)
                setMenuOpen(false)
              }}
            >
              {reanalyzing && <Loader2 size={12} className="animate-spin" />}
              Réanalyser
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onSetStatus(cv.id, 'active'); setMenuOpen(false) }}
            >
              Marquer comme actif
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onSetStatus(cv.id, 'archived'); setMenuOpen(false) }}
            >
              Archiver
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg)] border-t"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { onDelete(cv.id); setMenuOpen(false) }}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
