import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateLibrarySuggestions } from '@/lib/ai'
import type { Experience, CvDocument } from '@/lib/types'

interface LibrarySuggestionsPanelProps {
  experiences: Experience[]
  cvDocuments: CvDocument[]
}

export function LibrarySuggestionsPanel({ experiences, cvDocuments }: LibrarySuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateLibrarySuggestions({
        experiences: experiences.map((e) => ({ title: e.title, organization: e.organization, skills: e.skills })),
        cvDocuments: cvDocuments.map((cv) => ({ file_name: cv.file_name, ats_score: cv.ats_score })),
      })
      setSuggestions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card px-5 py-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Suggestions IA</h2>
        <span className="badge bg-purple-100 text-purple-700">Béta</span>
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 text-left text-sm rounded-[var(--radius)] border px-3.5 py-2.5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold text-white shrink-0"
                style={{ background: 'var(--color-accent)' }}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          L'IA analyse vos CV et vos expériences pour vous suggérer des compétences à renforcer ou des expériences à valoriser.
        </p>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <button className="btn btn-primary flex items-center gap-2 self-start" onClick={handleGenerate} disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Lancer une analyse IA
      </button>
    </section>
  )
}
