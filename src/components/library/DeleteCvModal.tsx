import { useState } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import type { CvDocument } from '@/lib/types'

interface DeleteCvModalProps {
  cv: CvDocument
  linkedCount: number
  onConfirm: (deleteLinkedExperiences: boolean) => Promise<string | null>
  onClose: () => void
}

export function DeleteCvModal({ cv, linkedCount, onConfirm, onClose }: DeleteCvModalProps) {
  const [deleteLinkedExperiences, setDeleteLinkedExperiences] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Supprimer "{cv.file_name}"</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Le fichier sera définitivement supprimé. Cette action est irréversible.</span>
          </div>

          {linkedCount > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[var(--color-muted)]">
                {linkedCount} expérience{linkedCount > 1 ? 's' : ''} de votre bibliothèque {linkedCount > 1 ? 'ont été extraites' : 'a été extraite'} de ce CV.
              </p>

              <label className="flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer" style={{ borderColor: 'var(--color-border)' }}>
                <input
                  type="radio"
                  name="delete-scope"
                  className="mt-1"
                  checked={!deleteLinkedExperiences}
                  onChange={() => setDeleteLinkedExperiences(false)}
                />
                <span className="text-sm">
                  <span className="font-medium">Conserver les expériences</span>
                  <br />
                  <span className="text-[var(--color-muted)]">Elles resteront dans la bibliothèque, marquées "Saisie manuelle".</span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer" style={{ borderColor: 'var(--color-border)' }}>
                <input
                  type="radio"
                  name="delete-scope"
                  className="mt-1"
                  checked={deleteLinkedExperiences}
                  onChange={() => setDeleteLinkedExperiences(true)}
                />
                <span className="text-sm">
                  <span className="font-medium text-[var(--color-danger)]">Supprimer aussi les expériences liées</span>
                  <br />
                  <span className="text-[var(--color-muted)]">Les {linkedCount} expérience{linkedCount > 1 ? 's' : ''} seront définitivement supprimée{linkedCount > 1 ? 's' : ''}.</span>
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button
              type="button"
              className="btn btn-danger flex items-center gap-2"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true)
                const err = await onConfirm(deleteLinkedExperiences)
                setSubmitting(false)
                if (err) setError(err)
                else onClose()
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
