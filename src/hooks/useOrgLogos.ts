import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OrgLogoRow {
  orgName: string
  url: string | null
}

export function useOrgLogos(userId: string | null) {
  const [logos, setLogos] = useState<Record<string, string>>({})

  const refetch = useCallback(async () => {
    if (!userId) { setLogos({}); return }
    const { data, error } = await supabase
      .from('OrgLogo')
      .select('orgName, url')
      .eq('userId', userId)
    if (error || !data) return
    const map: Record<string, string> = {}
    for (const row of data as OrgLogoRow[]) {
      if (row.url) map[row.orgName] = row.url
    }
    setLogos(map)
  }, [userId])

  useEffect(() => { refetch() }, [refetch])

  const setOrgWebsite = useCallback(
    async (orgName: string, website: string): Promise<string | null> => {
      if (!userId) return null
      const { error } = await supabase
        .from('OrgLogo')
        .upsert(
          { id: crypto.randomUUID(), userId, orgName, url: website, source: 'manual', updatedAt: new Date().toISOString() },
          { onConflict: 'userId,orgName' },
        )
      if (error) return error.message
      setLogos((prev) => ({ ...prev, [orgName]: website }))
      return null
    },
    [userId],
  )

  return { logos, setOrgWebsite, refetch }
}
