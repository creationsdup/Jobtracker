import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AtsAnalysis } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface AtsAnalysisDetailModalProps {
  analysis: AtsAnalysis
  cvFileName: string
  mode: 'view' | 'optimize'
  onGenerateRecommendations: (id: string) => Promise<string | null>
  onClose: () => void
}

export function AtsAnalysisDetailModal({
  analysis,
  cvFileName,
  mode,
  onGenerateRecommendations,
  onClose,
}: AtsAnalysisDetailModalProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'optimize' || analysis.recommendations) return
    setGenerating(true)
    onGenerateRecommendations(analysis.id)
      .then((err) => setError(err))
      .finally(() => setGenerating(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, analysis.id])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">{analysis.title}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={analysis.score} size={56} />
            <div>
              <p className="text-sm font-semibold">{cvFileName}</p>
              <p className="text-xs text-[var(--color-muted)]">Analysé le {formatDate(analysis.created_at)}</p>
            </div>
          </div>

          {analysis.job_description && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Description du poste</p>
              <p className="text-sm whitespace-pre-wrap">{analysis.job_description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Mots-clés manquants</p>
            {analysis.missing_keywords.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Aucun mot-clé manquant détecté.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_keywords.map((kw) => (
                  <span key={kw} className="badge bg-amber-100 text-amber-700">{kw}</span>
                ))}
              </div>
            )}
          </div>

          {mode === 'optimize' && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Recommandations</p>
              {generating ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <Loader2 size={14} className="animate-spin" />
                  Génération des recommandations…
                </div>
              ) : error ? (
                <p className="text-sm text-[var(--color-danger)]">{error}</p>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{analysis.recommendations}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
