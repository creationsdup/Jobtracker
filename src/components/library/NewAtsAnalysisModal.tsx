// src/components/library/NewAtsAnalysisModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { CvDocument } from '@/lib/types'

interface NewAtsAnalysisModalProps {
  cvDocuments: CvDocument[]
  onSubmit: (input: { cvId: string; title: string; jobTitle?: string; jobDescription?: string }) => Promise<string | null>
  onClose: () => void
}

export function NewAtsAnalysisModal({ cvDocuments, onSubmit, onClose }: NewAtsAnalysisModalProps) {
  const [cvId, setCvId] = useState(cvDocuments[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Nouvelle analyse ATS</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!cvId) { setError('Sélectionnez un CV.'); return }
            setSubmitting(true)
            const err = await onSubmit({
              cvId,
              title: title.trim() || `Analyse — ${cvDocuments.find((cv) => cv.id === cvId)?.file_name ?? ''}`,
              jobTitle: jobTitle.trim() || undefined,
              jobDescription: jobDescription.trim() || undefined,
            })
            setSubmitting(false)
            if (err) setError(err)
            else onClose()
          }}
        >
          {cvDocuments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez d'abord un CV pour lancer une analyse.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">CV à analyser</span>
                <select className="input" value={cvId} onChange={(e) => setCvId(e.target.value)}>
                  {cvDocuments.map((cv) => (
                    <option key={cv.id} value={cv.id}>{cv.file_name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Nom de l'analyse (optionnel)</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Chef de projet Innovation" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Titre du poste ciblé (optionnel)</span>
                <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-muted)]">Description du poste (optionnel)</span>
                <textarea className="input resize-y min-h-28" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
              </label>
            </>
          )}

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting || cvDocuments.length === 0}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Lancer l'analyse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
