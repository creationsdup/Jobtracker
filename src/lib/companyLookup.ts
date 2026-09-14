import { normalizeCompanyName } from './companyName'

// Autocomplétion d'entreprises de Clearbit (HubSpot) : gratuite, sans clé, appelable depuis le navigateur.
// Service non documenté : s'il ferme ou échoue, les cartes retombent simplement sur l'avatar à initiale.
const SUGGEST_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest'
const LOOKUP_TIMEOUT_MS = 4000
const DOMAIN_REGEX = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export interface CompanySuggestion {
  name: string
  domain: string
}

export type SuggestFetch = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

export function parseSuggestions(body: unknown): CompanySuggestion[] {
  if (!Array.isArray(body)) return []
  return body.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { name, domain } = item as Record<string, unknown>
    return typeof name === 'string' && typeof domain === 'string' ? [{ name, domain }] : []
  })
}

// WHY: nom identique uniquement (après normalisation) — le 1er résultat de Clearbit pour « Free » est
// FreeOnes, pour « Orange » un journal américain : mieux vaut l'initiale qu'un faux logo.
export function pickCompanyDomain(company: string, suggestions: CompanySuggestion[]): string | null {
  const wanted = normalizeCompanyName(company)
  if (!wanted) return null
  const match = suggestions.find((s) => normalizeCompanyName(s.name) === wanted && DOMAIN_REGEX.test(s.domain))
  return match ? match.domain.toLowerCase() : null
}

/** Recherche du domaine d'une entreprise, mémorisée par nom normalisé (les échecs réseau ne le sont pas). */
export function createCompanyDomainFinder(fetchFn: SuggestFetch): (company: string) => Promise<string | null> {
  const cache = new Map<string, Promise<string | null>>()

  return (company) => {
    const key = normalizeCompanyName(company)
    if (!key) return Promise.resolve(null)
    const cached = cache.get(key)
    if (cached) return cached

    const pending = (async () => {
      const query = new URLSearchParams({ query: company.trim() })
      const res = await fetchFn(`${SUGGEST_URL}?${query}`, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) })
      if (!res.ok) throw new Error('Clearbit indisponible')
      return pickCompanyDomain(company, parseSuggestions(await res.json()))
    })().catch(() => {
      // WHY: une panne ou un délai dépassé n'est pas une réponse : la prochaine demande retentera.
      cache.delete(key)
      return null
    })
    cache.set(key, pending)
    return pending
  }
}

export const findCompanyDomain = createCompanyDomainFinder((url, init) => fetch(url, init))

/** Entreprises à rechercher : une fois chacune, sans logo connu et sans recherche déjà lancée. */
export function companiesToLookUp(
  companies: string[],
  hasKnownLogo: (company: string) => boolean,
  queued: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const company of companies) {
    const key = normalizeCompanyName(company)
    if (!key || seen.has(key) || queued.has(key)) continue
    seen.add(key)
    if (!hasKnownLogo(company)) result.push(company)
  }
  return result
}
