export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024

interface FileLike {
  name: string
  size: number
  type: string
}

export function validateCvFile(file: FileLike): string | null {
  const lowerName = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf')
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')

  if (!isPdf && !isDocx) return 'Format non supporté — PDF ou DOCX uniquement'
  if (file.size > CV_MAX_SIZE_BYTES) return 'Fichier trop lourd (max 5 Mo)'
  return null
}

export type ScoreTone = 'success' | 'warning' | 'danger'

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

export function ringOffset(score: number, circumference: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return circumference * (1 - clamped / 100)
}

interface CvLike {
  ats_score: number | null
}

interface AnalysisLike {
  score: number
  missing_keywords: string[]
}

export interface LibraryStats {
  cvCount: number
  analysisCount: number
  avgScore: number | null
  missingKeywordsCount: number
}

export function computeLibraryStats(cvDocuments: CvLike[], atsAnalyses: AnalysisLike[]): LibraryStats {
  const scores = atsAnalyses.map((a) => a.score)
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null
  const missingKeywordsCount = atsAnalyses.reduce((sum, a) => sum + a.missing_keywords.length, 0)
  return {
    cvCount: cvDocuments.length,
    analysisCount: atsAnalyses.length,
    avgScore,
    missingKeywordsCount,
  }
}

export function buildAtsAnalysisUserContent(cvText: string, jobTitle?: string, jobDescription?: string): string {
  const parts = [`CV :\n${cvText.slice(0, 12000)}`]
  if (jobTitle) parts.push(`Titre du poste ciblé : ${jobTitle}`)
  if (jobDescription) parts.push(`Description du poste :\n${jobDescription.slice(0, 4000)}`)
  return parts.join('\n\n')
}

export interface AtsAnalysisResult {
  score: number
  missingKeywords: string[]
  recommendations: string
}

function dedupeTrimmed(values: unknown[]): string[] {
  return [...new Set(
    values
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim()),
  )]
}

export function parseAtsAnalysisResponse(raw: unknown): AtsAnalysisResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawScore = typeof obj.score === 'number' ? obj.score : 0
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const missingKeywords = Array.isArray(obj.missingKeywords) ? dedupeTrimmed(obj.missingKeywords) : []
  const recommendations = typeof obj.recommendations === 'string' ? obj.recommendations.trim() : ''
  return { score, missingKeywords, recommendations }
}

interface ExperienceLike {
  title: string
  organization: string
  skills: string[]
}

interface CvDocLike {
  file_name: string
  ats_score: number | null
}

export function buildSuggestionsUserContent(experiences: ExperienceLike[], cvDocuments: CvDocLike[]): string {
  const expLines = experiences
    .slice(0, 15)
    .map((e) => `- ${e.title} chez ${e.organization} (${e.skills.join(', ')})`)
    .join('\n')
  const cvLines = cvDocuments
    .map((cv) => `- ${cv.file_name} (score ATS: ${cv.ats_score ?? 'inconnu'})`)
    .join('\n')
  return `Expériences :\n${expLines || 'Aucune expérience renseignée'}\n\nCV importés :\n${cvLines || 'Aucun CV importé'}`
}

export function parseSuggestionsResponse(raw: unknown): string[] {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!Array.isArray(obj.suggestions)) return []
  return dedupeTrimmed(obj.suggestions).slice(0, 3)
}

interface ExperienceDateLike {
  organization: string
  startDate: string
  endDate: string | null
  current: boolean
}

function normalizeOrgName(org: string): string {
  return org.trim().toLowerCase().replace(/\s+/g, ' ')
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function dateRangesOverlap(a: ExperienceDateLike, b: ExperienceDateLike): boolean {
  const aStart = monthKey(a.startDate)
  const bStart = monthKey(b.startDate)
  const aEnd = a.current || !a.endDate ? '9999-99' : monthKey(a.endDate)
  const bEnd = b.current || !b.endDate ? '9999-99' : monthKey(b.endDate)
  return aStart <= bEnd && bStart <= aEnd
}

/**
 * Détecte un doublon probable : même organisation (normalisée) et plages de dates qui se
 * recoupent. Volontairement plus permissif que la dédup stricte de useExperiences (qui exige
 * un titre identique) — deux imports du même poste depuis des CV différents peuvent décrire le
 * même job avec des intitulés légèrement différents.
 */
export function isLikelyDuplicateExperience(entry: ExperienceDateLike, existing: ExperienceDateLike[]): boolean {
  const entryOrg = normalizeOrgName(entry.organization)
  if (!entryOrg) return false
  return existing.some((exp) => normalizeOrgName(exp.organization) === entryOrg && dateRangesOverlap(entry, exp))
}
