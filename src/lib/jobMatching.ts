// Pure scoring logic for matching a job offer against a user's search
// objective. No React, no Supabase — testable as plain functions.

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary phrase match — avoids "industrie" falsely matching inside "industriels". */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const h = normalizeText(haystack)
  const p = normalizeText(phrase)
  if (!p) return false
  return new RegExp(`\\b${escapeRegExp(p)}\\b`).test(h)
}

/** Bidirectional substring match after normalization — for short/specific tokens (contract types, city names). */
export function eitherContains(a: string, b: string): boolean {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}

import type { UserGoal, Application } from '@/lib/types'
import type { CategoryScores, JobMatchInput, MatchConfidence, MatchLevel, MatchResult } from '@/types/jobMatching'

interface ScoredCategory {
  score: number
  reason?: string
  warning?: string
  missing?: string
}

const STOPWORDS = new Set(['de', 'le', 'la', 'les', 'des', 'du', 'un', 'une', 'et', 'en', 'd', 'l', 'h', 'f'])

function significantWords(s: string): string[] {
  return normalizeText(s).split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

function wordOverlapRatio(needle: string, haystack: string): number {
  const words = significantWords(needle)
  const haystackWords = new Set(significantWords(haystack))
  if (words.length === 0 || haystackWords.size === 0) return 0
  const matched = words.filter((w) => haystackWords.has(w)).length
  return matched / words.length
}

// ─── Title ──────────────────────────────────────────────────────────────────

function scoreTitle(jobTitle: string, objective: UserGoal): ScoredCategory {
  const roles = [objective.target_title, ...objective.target_roles].filter((r): r is string => !!r && r.trim().length > 0)
  if (roles.length === 0) return { score: 50, missing: 'Aucun intitulé ou poste cible défini dans votre objectif' }

  const best = Math.max(...roles.map((role) =>
    eitherContains(role, jobTitle) ? 1 : wordOverlapRatio(role, jobTitle),
  ))

  if (best === 1) return { score: 95, reason: 'Le poste est proche de votre objectif.' }
  if (best >= 0.5) return { score: 75, reason: 'Le poste recoupe partiellement votre objectif.' }
  if (best > 0) return { score: 55, warning: 'Le poste ne recoupe que faiblement votre objectif.' }
  return { score: 35, warning: "Le poste ne correspond pas à l'intitulé ou aux rôles visés." }
}

// ─── Contract ───────────────────────────────────────────────────────────────

function scoreContract(contract: string | null, objective: UserGoal): ScoredCategory {
  if (objective.contract_types.length === 0) return { score: 50, missing: 'Aucun type de contrat défini dans votre objectif' }
  if (!contract || !contract.trim()) return { score: 50, missing: "Type de contrat non renseigné sur l'offre" }

  if (objective.contract_types.some((c) => eitherContains(c, contract))) {
    return { score: 95, reason: 'Le contrat correspond à votre recherche.' }
  }
  if (containsPhrase(contract, 'stage')) {
    return { score: 25, warning: 'Stage — non recherché dans votre objectif.' }
  }
  return { score: 40, warning: 'Le type de contrat ne correspond pas exactement à votre objectif.' }
}

// ─── Location ───────────────────────────────────────────────────────────────

const IDF_ALIASES = ['courbevoie', 'puteaux', 'la defense', 'boulogne-billancourt', 'boulogne billancourt', 'nanterre', 'saint-denis', 'saint denis', 'levallois-perret', 'levallois perret', 'neuilly-sur-seine', 'neuilly sur seine']
const IDF_NAMES = ['paris', 'ile-de-france', 'ile de france', 'idf']
const FOREIGN_HINTS = ['netherlands', 'pays-bas', 'pays bas', 'allemagne', 'germany', 'espagne', 'spain', 'belgique', 'belgium', 'italie', 'italy', 'royaume-uni', 'royaume uni', 'united kingdom', 'etats-unis', 'etats unis', 'usa']

function isIdfReference(s: string): boolean {
  const n = normalizeText(s)
  return IDF_NAMES.some((name) => n.includes(name)) || IDF_ALIASES.some((alias) => n.includes(alias))
}

function scoreLocation(location: string | null, objective: UserGoal): ScoredCategory {
  if (objective.locations.length === 0) return { score: 50, missing: 'Aucune localisation cible définie dans votre objectif' }
  if (!location || !location.trim()) return { score: 50, missing: 'Localisation non renseignée sur l\'offre' }

  if (objective.locations.some((loc) => eitherContains(loc, location))) {
    return { score: 90, reason: 'La localisation est compatible.' }
  }
  if (isIdfReference(location) && objective.locations.some(isIdfReference)) {
    return { score: 85, reason: 'La localisation est dans votre zone Île-de-France.' }
  }
  if (containsPhrase(location, 'france') && objective.locations.some((loc) => !containsPhrase(loc, 'france'))) {
    return { score: 65, reason: 'La localisation est en France, sans correspondre à une zone précise.' }
  }
  if (FOREIGN_HINTS.some((hint) => containsPhrase(location, hint))) {
    return { score: 30, warning: 'La localisation est hors de votre zone géographique cible.' }
  }
  return { score: 40, warning: "La localisation ne correspond à aucune de vos zones cibles." }
}

// ─── Company ────────────────────────────────────────────────────────────────

function scoreCompany(company: string, objective: UserGoal, text: string): ScoredCategory {
  if (!company || !company.trim()) return { score: 50, missing: 'Entreprise non renseignée sur l\'offre' }
  if (objective.target_companies.length === 0) return { score: 50, missing: 'Aucune entreprise cible définie dans votre objectif' }

  if (objective.target_companies.some((c) => eitherContains(c, company))) {
    return { score: 100, reason: "L'entreprise fait partie de vos cibles." }
  }
  if (objective.sectors.some((sector) => containsPhrase(text, sector))) {
    return { score: 65, reason: "L'entreprise est proche de vos secteurs cibles." }
  }
  return { score: 40, warning: "L'entreprise n'a pas de lien évident avec vos cibles." }
}

// ─── Sector ─────────────────────────────────────────────────────────────────

function scoreSector(text: string, objective: UserGoal): ScoredCategory {
  if (objective.sectors.length === 0) return { score: 50, missing: 'Aucun secteur cible défini dans votre objectif' }
  if (!text.trim()) return { score: 50, missing: 'Pas assez de texte sur l\'offre pour évaluer le secteur' }

  if (objective.sectors.some((sector) => containsPhrase(text, sector))) {
    return { score: 85, reason: 'Le secteur est cohérent avec votre objectif.' }
  }
  return { score: 35, warning: 'Le secteur de cette offre semble peu aligné avec votre objectif.' }
}

// ─── Keywords ───────────────────────────────────────────────────────────────

function scoreKeywords(text: string, objective: UserGoal): ScoredCategory {
  const wanted = objective.keywords_wanted
  const excluded = objective.keywords_excluded

  let base: number
  let reason: string | undefined
  let missing: string | undefined
  if (wanted.length === 0) {
    base = 50
    missing = 'Aucun mot-clé positif défini dans votre objectif'
  } else {
    const found = wanted.filter((k) => containsPhrase(text, k))
    const ratio = found.length / wanted.length
    base = Math.round(40 + ratio * 60)
    if (found.length > 0) reason = `Mots-clés cohérents détectés : ${found.join(', ')}`
  }

  const foundExcluded = excluded.filter((k) => containsPhrase(text, k))
  let warning: string | undefined
  if (foundExcluded.length > 0) {
    base = Math.max(10, base - 25 * foundExcluded.length)
    warning = `Mot${foundExcluded.length > 1 ? 's' : ''}-clé${foundExcluded.length > 1 ? 's' : ''} à éviter détecté${foundExcluded.length > 1 ? 's' : ''} : ${foundExcluded.join(', ')}`
  }

  return { score: base, reason, warning, missing }
}

// ─── Experience ─────────────────────────────────────────────────────────────

const SENIOR_HINTS = ['senior', 'confirme', 'expert', '5 ans', '6 ans', '7 ans', '8 ans', '9 ans', '10 ans']
const JUNIOR_HINTS = ['junior', 'graduate', 'jeune diplome', 'debutant', '0-2 ans', '1-2 ans', '1-3 ans', 'stagiaire']

function detectLevel(text: string): 'senior' | 'junior' | 'unknown' {
  if (SENIOR_HINTS.some((h) => containsPhrase(text, h))) return 'senior'
  if (JUNIOR_HINTS.some((h) => containsPhrase(text, h))) return 'junior'
  return 'unknown'
}

function scoreExperience(text: string, objective: UserGoal): ScoredCategory {
  if (objective.experience_level.length === 0) return { score: 50, missing: 'Aucun niveau d\'expérience défini dans votre objectif' }

  const appLevel = detectLevel(text)
  if (appLevel === 'unknown') return { score: 50, missing: "Niveau d'expérience non détecté dans l'offre" }

  const objectiveLevel = objective.experience_level.join(' ')
  const wantsJunior = detectLevel(objectiveLevel) === 'junior' || JUNIOR_HINTS.some((h) => objective.experience_level.some((e) => containsPhrase(e, h)))
  const wantsSenior = detectLevel(objectiveLevel) === 'senior' || SENIOR_HINTS.some((h) => objective.experience_level.some((e) => containsPhrase(e, h)))

  if ((appLevel === 'junior' && wantsJunior) || (appLevel === 'senior' && wantsSenior)) {
    return { score: 90, reason: "Le niveau d'expérience correspond à votre objectif." }
  }
  return { score: 30, warning: "Le niveau d'expérience demandé ne correspond pas à votre objectif." }
}

// ─── Aggregation ────────────────────────────────────────────────────────────

const WEIGHTS: CategoryScores = {
  title: 0.25, contract: 0.15, location: 0.15, company: 0.15, sector: 0.10, keywords: 0.15, experience: 0.05,
}

export function levelFor(score: number): MatchLevel {
  if (score >= 75) return 'Très cohérent'
  if (score >= 60) return 'Cohérent'
  if (score >= 45) return 'Moyen'
  if (score >= 30) return 'Peu cohérent'
  return 'Hors cible'
}

function confidenceFor(missingCount: number): MatchConfidence {
  if (missingCount === 0) return 'Haute'
  if (missingCount <= 2) return 'Moyenne'
  return 'Faible'
}

export function calculateJobMatch(job: JobMatchInput, objective: UserGoal): MatchResult {
  const text = `${job.title} ${job.company} ${job.text}`.trim()

  const title = scoreTitle(job.title, objective)
  const contract = scoreContract(job.contract, objective)
  const location = scoreLocation(job.location, objective)
  const company = scoreCompany(job.company, objective, text)
  const sector = scoreSector(text, objective)
  const keywords = scoreKeywords(text, objective)
  const experience = scoreExperience(text, objective)

  const categories = { title, contract, location, company, sector, keywords, experience }
  const categoryScores: CategoryScores = {
    title: title.score, contract: contract.score, location: location.score,
    company: company.score, sector: sector.score, keywords: keywords.score, experience: experience.score,
  }

  const weightedSum = (Object.keys(WEIGHTS) as (keyof CategoryScores)[])
    .reduce((sum, key) => sum + categoryScores[key] * WEIGHTS[key], 0)

  // WHY: excluded keywords are penalized twice on purpose — once inside scoreKeywords
  // (dampens that one category) and again here as a flat penalty on the total, so a
  // single bad keyword hit visibly drags down the overall score, not just one of 7 bars.
  const excludedHits = objective.keywords_excluded.filter((k) => containsPhrase(text, k)).length
  const globalPenalty = Math.min(15, excludedHits * 5)
  const totalScore = Math.max(5, Math.min(100, Math.round(weightedSum) - globalPenalty))

  const reasons = Object.values(categories).map((c) => c.reason).filter((r): r is string => !!r)
  const warnings = Object.values(categories).map((c) => c.warning).filter((w): w is string => !!w)
  const missingData = Object.values(categories).map((c) => c.missing).filter((m): m is string => !!m)

  return {
    totalScore,
    level: levelFor(totalScore),
    confidence: confidenceFor(missingData.length),
    categoryScores,
    reasons,
    warnings,
    missingData,
  }
}

export function applicationToJobMatchInput(app: Application): JobMatchInput {
  return {
    title: app.position,
    company: app.company,
    location: app.location,
    contract: app.contractType,
    text: [app.position, app.notes].filter(Boolean).join('. '),
  }
}
