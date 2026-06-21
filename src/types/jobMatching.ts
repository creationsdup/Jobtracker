// Generic view of a job offer for matching purposes. Decoupled from the
// `Application` DB shape so the scoring logic can be unit-tested with plain
// objects (see the test scenarios in jobMatching.test.ts) and reused if a
// non-Application source of offers is added later.
export interface JobMatchInput {
  title: string
  company: string
  location: string | null
  contract: string | null
  /** Free text aggregating description/notes — anything searchable for sector & keyword detection. */
  text: string
}

export type MatchLevel = 'Très cohérent' | 'Cohérent' | 'Moyen' | 'Peu cohérent' | 'Hors cible'

export type MatchConfidence = 'Haute' | 'Moyenne' | 'Faible'

export interface CategoryScores {
  title: number
  contract: number
  location: number
  company: number
  sector: number
  keywords: number
  experience: number
}

export interface MatchResult {
  totalScore: number
  level: MatchLevel
  confidence: MatchConfidence
  categoryScores: CategoryScores
  reasons: string[]
  warnings: string[]
  missingData: string[]
}
