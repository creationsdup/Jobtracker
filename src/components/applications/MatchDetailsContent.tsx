import type { CategoryScores, MatchResult } from '@/types/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'

interface MatchDetailsContentProps {
  result: MatchResult
  /** Hide the score/level header — set to false when the caller already shows the score elsewhere (e.g. a badge right above this content). */
  showHeader?: boolean
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

// Shared body for the match score explanation — reused by MatchDetailsModal
// (popup) and inline expandable panels (e.g. ApplicationDetail) so both stay
// in sync without duplicating the category/reasons/warnings/missingData logic.
export function MatchDetailsContent({ result, showHeader = true }: MatchDetailsContentProps) {
  const { fg: color, bg } = matchLevelColor(result.level)

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Score global</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{result.totalScore}%</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
            {result.level}
          </span>
        </div>
      )}

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
  )
}
