import { X } from 'lucide-react'
import type { CategoryScores, MatchResult } from '@/types/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'

interface MatchDetailsModalProps {
  result: MatchResult
  onClose: () => void
}

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  title: 'Poste',
  contract: 'Contrat',
  location: 'Localisation',
  company: 'Entreprise',
  sector: 'Secteur',
  keywords: 'Mots-clés',
  experience: 'Expérience',
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'var(--color-accent)' }} />
      </div>
    </div>
  )
}

export function MatchDetailsModal({ result, onClose }: MatchDetailsModalProps) {
  const { fg: color, bg } = matchLevelColor(result.level)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Score global</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{result.totalScore}%</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
              {result.level}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <X size={15} style={{ color: 'var(--color-muted)' }} />
            </button>
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Confiance : {result.confidence}</p>

        <div className="flex flex-col gap-3">
          {(Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).map((key) => (
            <CategoryBar key={key} label={CATEGORY_LABELS[key]} value={result.categoryScores[key]} />
          ))}
        </div>

        {result.reasons.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Pourquoi cette note ?</h4>
            <ul className="flex flex-col gap-1">
              {result.reasons.map((r) => (
                <li key={r} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-success)' }}>•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Points d'attention</h4>
            <ul className="flex flex-col gap-1">
              {result.warnings.map((w) => (
                <li key={w} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span style={{ color: 'var(--color-warning)' }}>•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.missingData.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Données manquantes</h4>
            <ul className="flex flex-col gap-1">
              {result.missingData.map((m) => (
                <li key={m} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <span>•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
