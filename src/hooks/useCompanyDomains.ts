import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeCompanyName } from '@/lib/companyName'

interface CompanyDomainRow {
  name_normalized: string
  domain: string
}

// Catalogue partagé (pas par utilisateur) d'entreprises connues -> domaine.
// S'enrichit automatiquement quand un utilisateur confirme le site web d'une entreprise.
export function useCompanyDomains() {
  const [domains, setDomains] = useState<Record<string, string>>({})

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from('company_domains').select('name_normalized, domain')
    if (error || !data) return
    const map: Record<string, string> = {}
    for (const row of data as CompanyDomainRow[]) map[row.name_normalized] = row.domain
    setDomains(map)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const lookup = useCallback(
    (companyName: string): string | undefined => domains[normalizeCompanyName(companyName)],
    [domains],
  )

  const contribute = useCallback(
    async (displayName: string, domain: string): Promise<string | null> => {
      const normalized = normalizeCompanyName(displayName)
      if (!normalized) return null
      const { error } = await supabase
        .from('company_domains')
        .upsert({ name_normalized: normalized, display_name: displayName, domain, updated_at: new Date().toISOString() }, { onConflict: 'name_normalized' })
      if (error) return error.message
      setDomains((prev) => ({ ...prev, [normalized]: domain }))
      return null
    },
    [],
  )

  return { lookup, contribute }
}
