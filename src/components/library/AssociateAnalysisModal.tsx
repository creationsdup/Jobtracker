// src/components/library/AssociateAnalysisModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { AtsAnalysis, Application } from '@/lib/types'

interface AssociateAnalysisModalProps {
  analysis: AtsAnalysis
  applications: Application[]
  onAssociate: (analysisId: string, applicationId: string | null) => Promise<string | null>
  onClose: () => void
}

export function AssociateAnalysisModal({ analysis, applications, onAssociate, onClose }: AssociateAnalysisModalProps) {
  const [applicationId, setApplicationId] = useState(analysis.application_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Associer "{analysis.title}" à une candidature</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            const err = await onAssociate(analysis.id, applicationId || null)
            setSubmitting(false)
            if (err) setError(err)
            else onClose()
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Candidature</span>
            <select className="input" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
              <option value="">Aucune</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.company} — {app.position}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Associer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
