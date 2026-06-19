import { useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Upload, X, Check, Loader2, AlertCircle } from 'lucide-react'
import type { ExperienceType } from '@/lib/types'
import type { NewExperience } from '@/hooks/useExperiences'
import { generateStructuredData } from '@/lib/ai'

interface ParsedEntry {
  title: string
  organization: string
  type: 'work' | 'volunteer' | 'education' | 'project' | 'other'
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string
  location: string | null
  skills: string[]
  subsection: string | null
}

interface ParsedCvData {
  entries: ParsedEntry[]
  skills: string[]
  interests: string[]
}

interface PreviewEntry extends ParsedEntry {
  selected: boolean
}

interface CVImporterProps {
  userId: string
  existingSkills: string[]
  existingInterests: string[]
  onImportEntries: (items: NewExperience[]) => Promise<string | null>
  onImportProfileData: (payload: { skills: string[]; interests: string[] }) => Promise<string | null>
  onClose: () => void
}

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de CV.
Extrais du texte fourni :
- les expériences professionnelles
- les formations
- les projets utiles pour un CV
- les compétences
- les centres d'intérêt

Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format :
{
  "entries": [
    {
      "title": "string",
      "organization": "string",
      "type": "work | volunteer | education | project | other",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM | null",
      "isCurrent": boolean,
      "description": "string",
      "location": "string | null",
      "skills": ["string"],
      "subsection": "string | null"
    }
  ],
  "skills": ["string"],
  "interests": ["string"]
}

Contraintes :
- n'invente rien
- ignore les compétences trop vagues
- conserve les dates au format YYYY-MM quand elles sont connues
- les formations doivent être dans entries avec type "education"`

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function mapType(type: ParsedEntry['type']): ExperienceType {
  switch (type) {
    case 'volunteer':
      return 'VOLUNTEER'
    case 'education':
      return 'EDUCATION'
    case 'project':
      return 'PROJECT'
    case 'other':
      return 'OTHER'
    default:
      return 'WORK'
  }
}

function toDateStr(ym: string | null): string | null {
  if (!ym) return null
  return ym.length === 7 ? `${ym}-01` : ym
}

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

async function extractTextFromPDF(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
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

async function analyzeCv(text: string): Promise<ParsedCvData> {
  const raw = await generateStructuredData<ParsedCvData>(
    SYSTEM_PROMPT,
    text.slice(0, 16000),
    2800,
  )

  if (!Array.isArray(raw.entries) || !Array.isArray(raw.skills) || !Array.isArray(raw.interests)) {
    throw new Error('Réponse OpenAI inattendue')
  }

  return {
    entries: raw.entries.filter((entry) => entry.title && entry.organization && entry.startDate),
    skills: dedupe(raw.skills),
    interests: dedupe(raw.interests),
  }
}

export function CVImporter({
  userId,
  existingSkills,
  existingInterests,
  onImportEntries,
  onImportProfileData,
  onClose,
}: CVImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'loading' | 'preview' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  const [skillsText, setSkillsText] = useState('')
  const [interestsText, setInterestsText] = useState('')

  const selectedCount = useMemo(
    () => entries.filter((entry) => entry.selected).length,
    [entries],
  )

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
      const text = isPDF ? await extractTextFromPDF(file) : await extractTextFromDOCX(file)
      if (!text.trim()) throw new Error('Impossible d’extraire du texte du fichier')

      const parsed = await analyzeCv(text)
      setEntries(parsed.entries.map((entry) => ({ ...entry, selected: true })))
      setSkillsText(dedupe([...existingSkills, ...parsed.skills]).join(', '))
      setInterestsText(dedupe([...existingInterests, ...parsed.interests]).join(', '))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setStep('idle')
    }
  }

  async function handleConfirm() {
    const selectedEntries = entries.filter((entry) => entry.selected)
    setStep('saving')

    const mapped: NewExperience[] = selectedEntries.map((entry) => ({
      id: crypto.randomUUID(),
      userId,
      type: mapType(entry.type),
      title: entry.title.trim(),
      organization: entry.organization.trim(),
      location: entry.location?.trim() || null,
      startDate: toDateStr(entry.startDate) ?? new Date().toISOString().slice(0, 10),
      endDate: entry.isCurrent ? null : toDateStr(entry.endDate),
      current: entry.isCurrent,
      description: entry.description.trim() || null,
      skills: dedupe(entry.skills),
      subsection: entry.subsection?.trim() || null,
    }))

    const nextSkills = dedupe(skillsText.split(','))
    const nextInterests = dedupe(interestsText.split(','))

    const profileError = await onImportProfileData({ skills: nextSkills, interests: nextInterests })
    if (profileError) {
      setError(profileError)
      setStep('preview')
      return
    }

    const entriesError = mapped.length ? await onImportEntries(mapped) : null
    if (entriesError) {
      setError(entriesError)
      setStep('preview')
      return
    }

    onClose()
  }

  const allSelected = entries.length > 0 && entries.every((entry) => entry.selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">Importer un CV</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </button>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-muted)]">Analyse du CV en cours…</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-5">
              <div className="rounded-[18px] border bg-white/72 px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-deep-space)]">Entrées détectées</h3>
                    <p className="text-sm text-[var(--color-muted)]">
                      {selectedCount} / {entries.length} entrée(s) seront importée(s). Tu peux les corriger avant validation.
                    </p>
                  </div>
                  <button
                    className="text-xs text-[var(--color-primary)] hover:underline"
                    onClick={() => setEntries((prev) => prev.map((entry) => ({ ...entry, selected: !allSelected })))}
                  >
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {entries.map((entry, idx) => (
                    <div
                      key={`${entry.title}-${idx}`}
                      className={`rounded-[18px] border px-4 py-4 transition-colors ${
                        entry.selected ? 'bg-white' : 'bg-white/45 opacity-70'
                      }`}
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 shrink-0 accent-[var(--color-primary)]"
                          checked={entry.selected}
                          onChange={(e) => {
                            setEntries((prev) => prev.map((current, i) => (
                              i === idx ? { ...current, selected: e.target.checked } : current
                            )))
                          }}
                        />

                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <InlineField label="Type">
                            <select
                              className="input"
                              value={entry.type}
                              onChange={(e) => updateEntry(setEntries, idx, 'type', e.target.value as PreviewEntry['type'])}
                            >
                              <option value="work">Professionnel</option>
                              <option value="education">Formation</option>
                              <option value="volunteer">Bénévolat</option>
                              <option value="project">Projet</option>
                              <option value="other">Autre</option>
                            </select>
                          </InlineField>
                          <InlineField label="Sous-section">
                            <input
                              className="input"
                              value={entry.subsection ?? ''}
                              onChange={(e) => updateEntry(setEntries, idx, 'subsection', e.target.value)}
                              placeholder="Alternance, certification..."
                            />
                          </InlineField>
                          <InlineField label="Titre">
                            <input
                              className="input"
                              value={entry.title}
                              onChange={(e) => updateEntry(setEntries, idx, 'title', e.target.value)}
                            />
                          </InlineField>
                          <InlineField label="Organisation">
                            <input
                              className="input"
                              value={entry.organization}
                              onChange={(e) => updateEntry(setEntries, idx, 'organization', e.target.value)}
                            />
                          </InlineField>
                          <InlineField label="Début">
                            <input
                              className="input"
                              value={entry.startDate}
                              onChange={(e) => updateEntry(setEntries, idx, 'startDate', e.target.value)}
                              placeholder="2023-09"
                            />
                          </InlineField>
                          <InlineField label="Fin">
                            <input
                              className="input"
                              value={entry.endDate ?? ''}
                              disabled={entry.isCurrent}
                              onChange={(e) => updateEntry(setEntries, idx, 'endDate', e.target.value || null)}
                              placeholder="2024-06"
                            />
                          </InlineField>
                          <InlineField label="Localisation">
                            <input
                              className="input"
                              value={entry.location ?? ''}
                              onChange={(e) => updateEntry(setEntries, idx, 'location', e.target.value || null)}
                              placeholder="Paris, France"
                            />
                          </InlineField>
                          <label className="flex items-center gap-2 text-sm mt-6">
                            <input
                              type="checkbox"
                              checked={entry.isCurrent}
                              onChange={(e) => updateEntry(setEntries, idx, 'isCurrent', e.target.checked)}
                            />
                            Entrée en cours
                          </label>
                          <div className="md:col-span-2">
                            <InlineField label="Description">
                              <textarea
                                className="input resize-y min-h-24"
                                value={entry.description}
                                onChange={(e) => updateEntry(setEntries, idx, 'description', e.target.value)}
                              />
                            </InlineField>
                          </div>
                          <div className="md:col-span-2">
                            <InlineField label="Compétences liées">
                              <input
                                className="input"
                                value={entry.skills.join(', ')}
                                onChange={(e) => updateEntry(setEntries, idx, 'skills', dedupe(e.target.value.split(',')))}
                                placeholder="React, TypeScript, gestion de projet"
                              />
                            </InlineField>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-[18px] border bg-white/72 px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-base font-semibold text-[var(--color-deep-space)]">Compétences détectées</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-1">Tu peux les corriger avant de les enregistrer dans le profil.</p>
                  <textarea
                    className="input resize-y min-h-28 mt-3"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="TypeScript, React, Figma"
                  />
                </div>

                <div className="rounded-[18px] border bg-white/72 px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-base font-semibold text-[var(--color-deep-space)]">Centres d’intérêt détectés</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-1">Ajoute, retire ou reformule les éléments si nécessaire.</p>
                  <textarea
                    className="input resize-y min-h-28 mt-3"
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="Photographie, bénévolat, course à pied"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary flex items-center gap-2" onClick={handleConfirm}>
              <Check size={14} />
              Importer et enregistrer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function updateEntry<T extends keyof PreviewEntry>(
  setEntries: Dispatch<SetStateAction<PreviewEntry[]>>,
  index: number,
  key: T,
  value: PreviewEntry[T],
) {
  setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)))
}

function InlineField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      {children}
    </div>
  )
}
