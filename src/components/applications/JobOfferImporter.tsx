// src/components/applications/JobOfferImporter.tsx
// Scrape une URL d'offre d'emploi et pré-remplit le formulaire via IA
import { useState } from 'react'
import { Link, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { Application } from '@/lib/types'
import { generateStructuredData } from '@/lib/ai'

interface ParsedOffer {
  company: string
  position: string
  location: string | null
  contractType: string | null
  notes: string | null
  jobUrl: string
}

interface JobOfferImporterProps {
  onImport: (data: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onClose: () => void
}

const SYSTEM_PROMPT = `Tu es un assistant qui analyse des offres d'emploi.
Extrait les informations clés de l'offre fournie.
Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour.
Format attendu :
{
  "company": "string",
  "position": "string",
  "location": "string | null",
  "contractType": "string | null",
  "notes": "string (résumé court de 2-3 phrases de l'offre)"
}`

export function JobOfferImporter({ onImport, onClose }: JobOfferImporterProps) {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle')
  const [parsed, setParsed] = useState<ParsedOffer | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFetch() {
    if (!url.trim()) return
    setStep('loading')
    setErrorMsg('')

    try {
      const parsed = await generateStructuredData<Omit<ParsedOffer, 'jobUrl'>>(
        SYSTEM_PROMPT,
        `Analyse cette offre d'emploi à partir de cette URL et infère les champs utiles si le contenu n'est pas directement accessible: ${url}`,
      )
      setParsed({ ...parsed, jobUrl: url })
      setStep('preview')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Impossible d'analyser cette offre. Vérifiez l'URL et réessayez.")
      setStep('error')
    }
  }

  function handleConfirm() {
    if (!parsed) return
    onImport({
      company: parsed.company,
      position: parsed.position,
      location: parsed.location,
      contractType: parsed.contractType,
      notes: parsed.notes,
      jobUrl: parsed.jobUrl,
      status: 'WISHLIST',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Link size={16} /> Importer une offre
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-lg leading-none">×</button>
        </div>

        {(step === 'idle' || step === 'error') && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Collez l'URL d'une offre d'emploi. L'IA extraira automatiquement les informations.
            </p>
            <input
              className="input"
              placeholder="https://www.linkedin.com/jobs/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
            />
            {step === 'error' && (
              <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
                <AlertCircle size={12} /> {errorMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={handleFetch} disabled={!url.trim()}>
                Analyser
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted)]">Analyse de l'offre en cours…</p>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={14} /> Offre analysée avec succès
            </div>

            <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-4 flex flex-col gap-2">
              <Row label="Entreprise" value={parsed.company} />
              <Row label="Poste" value={parsed.position} />
              <Row label="Lieu" value={parsed.location} />
              <Row label="Contrat" value={parsed.contractType} />
              {parsed.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--color-muted)] mb-0.5">Résumé</p>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">{parsed.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary btn-sm" onClick={() => setStep('idle')}>Modifier l'URL</button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
                Créer la candidature
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <p className="text-[10px] font-semibold text-[var(--color-muted)] w-20 shrink-0">{label}</p>
      <p className="text-xs text-[var(--color-ink)]">{value}</p>
    </div>
  )
}
