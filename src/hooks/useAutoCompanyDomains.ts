import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeCompanyName } from '@/lib/companyName'
import { companiesToLookUp, findCompanyDomain } from '@/lib/companyLookup'

// Cherche automatiquement le site des entreprises du tableau qui n'ont encore aucun logo connu.
// Résultats gardés le temps de la visite, jamais écrits en base : une devinette ne doit pas entrer
// dans le catalogue partagé, où personne ne pourrait la corriger.
export function useAutoCompanyDomains(companies: string[], hasKnownLogo: (company: string) => boolean, ready: boolean) {
  const [domains, setDomains] = useState<Record<string, string>>({})
  const queued = useRef(new Set<string>())
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!ready) return
    for (const company of companiesToLookUp(companies, hasKnownLogo, queued.current)) {
      const key = normalizeCompanyName(company)
      queued.current.add(key)
      // WHY: une recherche à la fois, pour ne pas envoyer tout le tableau d'un coup à Clearbit.
      queue.current = queue.current.then(async () => {
        const domain = await findCompanyDomain(company)
        if (domain) setDomains((prev) => ({ ...prev, [key]: domain }))
      })
    }
  }, [companies, hasKnownLogo, ready])

  const lookup = useCallback(
    (company: string): string | undefined => domains[normalizeCompanyName(company)],
    [domains],
  )

  return { lookup }
}
