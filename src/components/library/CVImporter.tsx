import { useRef, useState } from 'react'
import { Upload, X, Check, Loader2, AlertCircle } from 'lucide-react'
import type { ExperienceType } from '@/lib/types'
import type { NewExperience } from '@/hooks/useExperiences'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedExperience {
  title: string
  company: string
  type: 'pro' | 'bénévolat' | 'stage'
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string
}

interface PreviewItem extends ParsedExperience {
  selected: boolean
}

interface CVImporterProps {
  userId: string
  onImport: (items: NewExperience[]) => Promise<string | null>
  onClose: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de CV.
Extrais toutes les expériences professionnelles, bénévoles et stages du texte fourni.

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour. Format attendu :
{
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "type": "pro | bénévolat | stage",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM | null",
      "isCurrent": boolean,
      "description": "string"
    }
  ]
}`

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapType(t: ParsedExperience['type']): ExperienceType {
  if (t === 'bénévolat') return 'VOLUNTEER'
  return 'WORK'
}

// Convert "YYYY-MM" → "YYYY-MM-01" for Supabase DATE columns
function toDateStr(ym: string | null): string | null {
  if (!ym) return null
  return ym.length === 7 ? `${ym}-01` : ym
}

async function extractTextFromPDF(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  // WHY: ?url import lets Vite bundle and serve the worker at the exact installed version
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n')
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function callOpenAI(text: string): Promise<ParsedExperience[]> {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key) throw new Error('VITE_OPENAI_API_KEY manquant dans .env.local')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text.slice(0, 12000) }, // guard against huge CVs
      ],
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body as { error?: { message?: string } }).error?.message ?? res.statusText
    throw new Error(`OpenAI : ${msg}`)
  }

  const json = await res.json()
  const raw = JSON.parse(json.choices[0].message.content) as { experiences: ParsedExperience[] }
  if (!Array.isArray(raw.experiences)) throw new Error('Réponse OpenAI inattendue')
  return raw.experiences
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CVImporter({ userId, onImport, onClose }: CVImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'loading' | 'preview' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<PreviewItem[]>([])

  async function handleFile(file: File) {
    if (file.size > MAX_SIZE_BYTES) {
      setError('Fichier trop lourd (max 5 Mo)')
      return
    }

    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    const isDOCX =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')

    if (!isPDF && !isDOCX) {
      setError('Format non supporté — PDF ou DOCX uniquement')
      return
    }

    setError(null)
    setStep('loading')

    try {
      const text = isPDF
        ? await extractTextFromPDF(file)
        : await extractTextFromDOCX(file)

      if (!text.trim()) throw new Error('Impossible d\'extraire du texte du fichier')

      const parsed = await callOpenAI(text)
      setItems(parsed.map((p) => ({ ...p, selected: true })))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setStep('idle')
    }
  }

  async function handleConfirm() {
    const selected = items.filter((i) => i.selected)
    if (!selected.length) return

    setStep('saving')
    const mapped: NewExperience[] = selected.map((p) => ({
      id: crypto.randomUUID(),
      userId,
      type: mapType(p.type),
      title: p.title,
      organization: p.company,
      location: null,
      startDate: toDateStr(p.startDate) ?? new Date().toISOString().slice(0, 10),
      endDate: toDateStr(p.endDate),
      current: p.isCurrent,
      description: p.description || null,
      skills: [],
      subsection: null,
    }))

    const err = await onImport(mapped)
    if (err) {
      setError(err)
      setStep('preview')
    } else {
      onClose()
    }
  }

  const allSelected = items.every((i) => i.selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">Importer un CV</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drop zone */}
          {step === 'idle' && (
            <button
              className="w-full border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 flex flex-col items-center gap-3 hover:border-[var(--color-primary)] hover:bg-blue-50/50 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={28} className="text-[var(--color-muted)]" />
              <div className="text-center">
                <p className="font-medium text-sm">Dépose ton CV ici</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">PDF ou DOCX · max 5 Mo</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
            </button>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-muted)]">Analyse du CV en cours…</p>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-[var(--color-muted)]">
                  {items.filter((i) => i.selected).length} / {items.length} expérience(s) sélectionnée(s)
                </p>
                <button
                  className="text-xs text-[var(--color-primary)] hover:underline"
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })))}
                >
                  {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {items.map((item, idx) => (
                <label
                  key={idx}
                  className={`card px-4 py-3 flex gap-3 cursor-pointer transition-colors ${
                    item.selected ? 'ring-2 ring-[var(--color-primary)]' : 'opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0 accent-[var(--color-primary)]"
                    checked={item.selected}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, selected: e.target.checked } : p))
                      )
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{item.company}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">
                      {item.startDate}
                      {item.isCurrent ? ' → Aujourd\'hui' : item.endDate ? ` → ${item.endDate}` : ''}
                    </div>
                    {item.description && (
                      <p className="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button
              className="btn btn-primary flex items-center gap-2"
              disabled={!items.some((i) => i.selected)}
              onClick={handleConfirm}
            >
              <Check size={14} />
              Importer {items.filter((i) => i.selected).length} expérience(s)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
