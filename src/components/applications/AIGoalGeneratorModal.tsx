import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { generateGoalFromText } from '@/lib/ai'
import { mapGeneratedGoalToDraft } from '@/lib/goalDraft'
import type { GoalUpdate } from '@/hooks/useGoals'

interface AIGoalGeneratorModalProps {
  onGenerated: (draft: GoalUpdate) => void
  onClose: () => void
}

export function AIGoalGeneratorModal({ onGenerated, onClose }: AIGoalGeneratorModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleGenerate() {
    if (!text.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      const generated = await generateGoalFromText(text)
      onGenerated(mapGeneratedGoalToDraft(generated))
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Impossible de générer l'objectif. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles size={16} /> Créer un objectif avec l'IA
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-lg leading-none">×</button>
        </div>

        {!loading && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Décris ce que tu recherches : poste, secteur, contrat, zone, entreprises visées,
              mots-clés à privilégier ou éviter, urgence, rythme de candidature…
            </p>
            <textarea
              className="input w-full text-sm resize-y"
              rows={5}
              placeholder="Ex : Je cherche un poste de chef de projet PMO dans le secteur transport, en CDI, sur Paris ou en Île-de-France, idéalement chez Keolis ou la SNCF. J'évite les postes de manutention. Je veux trouver vite, dans le mois."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            {errorMsg && (
              <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
                <AlertCircle size={12} /> {errorMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={!text.trim()}>
                Générer
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted)]">Génération de l'objectif en cours…</p>
          </div>
        )}
      </div>
    </div>
  )
}
