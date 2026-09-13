// Noyau pur de l'édition (lite | full) : aucune dépendance à Vite ni au DOM,
// pour être importable par vite.config.ts et testable par Vitest.

export type Edition = 'lite' | 'full'
export type FeatureKey = 'goals' | 'library' | 'ai' | 'accessCode'
export type FeatureFlags = Record<FeatureKey, boolean>

export function resolveEdition(raw: string | undefined): Edition {
  const value = raw?.trim() ?? ''
  // WHY: défaut fail-closed — une variable oubliée au déploiement ne doit jamais livrer l'IA.
  if (value === '') return 'lite'
  if (value === 'lite' || value === 'full') return value
  throw new Error(`VITE_EDITION invalide : "${raw}" (attendu : lite | full)`)
}

export function featuresFor(edition: Edition): FeatureFlags {
  const full = edition === 'full'
  // WHY: accessCode est le seul drapeau propre à lite (entrée par code au lieu des comptes classiques).
  return { goals: full, library: full, ai: full, accessCode: !full }
}

export function filterByFeature<T extends { feature?: FeatureKey }>(items: readonly T[], flags: FeatureFlags): T[] {
  return items.filter((item) => item.feature === undefined || flags[item.feature])
}
