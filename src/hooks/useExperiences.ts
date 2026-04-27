import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Experience } from '@/lib/types'

export function useExperiences(userId: string | null) {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) { setExperiences([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('Experience')
      .select('*')
      .eq('userId', userId)
      .order('startDate', { ascending: false })
    setExperiences(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  return { experiences, loading }
}
