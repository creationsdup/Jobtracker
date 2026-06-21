import { formatDate } from '@/lib/utils'
import type { AtsAnalysis } from '@/lib/types'
import { ScoreRing } from './ScoreRing'

interface AtsAnalysisRowProps {
  analysis: AtsAnalysis
  cvFileName: string
  onView: (analysis: AtsAnalysis) => void
  onOptimize: (analysis: AtsAnalysis) => void
  onAssociate: (analysis: AtsAnalysis) => void
}

export function AtsAnalysisRow({ analysis, cvFileName, onView, onOptimize, onAssociate }: AtsAnalysisRowProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-3 py-3 bg-white/72"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-[var(--color-deep-space)]">{analysis.title}</p>
        <p className="text-xs text-[var(--color-muted)] truncate">
          CV utilisé : {cvFileName} · Analysé le {formatDate(analysis.created_at)}
        </p>
      </div>

      <ScoreRing score={analysis.score} size={36} />

      <span className="text-xs text-[var(--color-muted)] w-28 text-right">
        {analysis.missing_keywords.length} mot{analysis.missing_keywords.length === 1 ? '' : 's'}-clés manquant{analysis.missing_keywords.length === 1 ? '' : 's'}
      </span>

      <button className="btn btn-secondary btn-sm" onClick={() => onView(analysis)}>Voir</button>
      <button className="btn btn-secondary btn-sm" onClick={() => onOptimize(analysis)}>Optimiser</button>
      <button className="btn btn-secondary btn-sm" onClick={() => onAssociate(analysis)}>Associer</button>
    </div>
  )
}
