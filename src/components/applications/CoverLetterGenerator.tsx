// src/components/applications/CoverLetterGenerator.tsx
// Génère une lettre de motivation personnalisée via IA
import { useState } from 'react'
import { Mail, Loader2, Copy, Check } from 'lucide-react'
import type { Application } from '@/lib/types'
import type { Profile } from '@/hooks/useProfile'
import type { Experience } from '@/lib/types'
import { generateText } from '@/lib/ai'

interface CoverLetterGeneratorProps {
  application: Application
  profile: Profile | null
  experiences: Experience[]
  onClose: () => void
}

type Tone = 'professional' | 'enthusiastic' | 'concise'

const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professionnel',
  enthusiastic: 'Enthousiaste',
  concise: 'Concis',
}

export function CoverLetterGenerator({ application, profile, experiences, onClose }: CoverLetterGeneratorProps) {
  const [tone, setTone] = useState<Tone>('professional')
  const [extraContext, setExtraContext] = useState('')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const relevantExps = experiences.slice(0, 5) // top 5 most recent

  async function generate() {
    setLoading(true)
    setError('')
    setLetter('')

    const expText = relevantExps
      .map(e => `- ${e.title} chez ${e.organization} (${e.startDate}${e.current ? ' – Présent' : e.endDate ? ` – ${e.endDate}` : ''}): ${e.description ?? ''}`)
      .join('\n')

    const prompt = `Génère une lettre de motivation en français pour ce candidat.

CANDIDAT :
- Nom : ${profile?.fullName ?? 'Non renseigné'}
- Titre : ${profile?.title ?? ''}
- Résumé : ${profile?.summary ?? ''}

EXPÉRIENCES CLÉS :
${expText || 'Aucune expérience renseignée'}

POSTE VISÉ :
- Entreprise : ${application.company}
- Poste : ${application.position}
- Lieu : ${application.location ?? 'Non précisé'}
- Type : ${application.contractType ?? 'Non précisé'}

TON SOUHAITÉ : ${TONE_LABELS[tone]}
${extraContext ? `\nCONTEXTE SUPPLÉMENTAIRE :\n${extraContext}` : ''}

La lettre doit faire 3-4 paragraphes, être personnalisée et ne pas être générique.
Ne mets pas de balises ni de formatage markdown dans ta réponse, juste le texte de la lettre.`

    try {
      const text = await generateText(
        'Tu es un assistant expert en lettres de motivation. Tu écris en français, de manière personnalisée, crédible et concise. Tu réponds uniquement avec le texte final de la lettre.',
        prompt,
      )
      setLetter(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération. Réessayez.')
    }
    setLoading(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 shrink-0">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail size={16} /> Lettre de motivation — {application.position} chez {application.company}
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-lg">×</button>
        </div>

        <div className="px-6 pb-5 overflow-y-auto flex flex-col gap-4">
          {/* Controls */}
          {!letter && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--color-muted)]">Ton</label>
                <div className="flex gap-2">
                  {(Object.keys(TONE_LABELS) as Tone[]).map(t => (
                    <button
                      key={t}
                      className={`btn btn-sm ${tone === t ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTone(t)}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--color-muted)]">
                  Contexte supplémentaire <span className="font-normal">(optionnel)</span>
                </label>
                <textarea
                  className="input text-sm resize-y"
                  rows={3}
                  placeholder="Ex : J'ai découvert cette entreprise via un ami, je suis passionné par leur produit X, je cherche une alternance..."
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                />
              </div>

              {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

              <button className="btn btn-primary flex items-center gap-2 self-end" onClick={generate} disabled={loading}>
                {loading ? <><Loader2 size={14} className="animate-spin" /> Génération…</> : <><Mail size={14} /> Générer la lettre</>}
              </button>
            </>
          )}

          {/* Generated letter */}
          {letter && (
            <>
              <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-4">
                <pre className="text-sm text-[var(--color-ink)] whitespace-pre-wrap font-sans leading-relaxed">{letter}</pre>
              </div>
              <div className="flex gap-2 justify-end shrink-0">
                <button className="btn btn-secondary btn-sm" onClick={() => setLetter('')}>
                  Régénérer
                </button>
                <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={handleCopy}>
                  {copied ? <><Check size={13} /> Copié !</> : <><Copy size={13} /> Copier</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
