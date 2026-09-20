import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setUsageOptedOut } from '@/lib/usageClient'

/** Refus de mesure d'usage, gardé dans usage_preferences et appliqué aussi par la règle RLS. */
export function useUsagePreference() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('usage_preferences').select('opted_out').maybeSingle()
      const value = data?.opted_out === true
      setOptedOut(value)
      setUsageOptedOut(value)
    })()
  }, [])

  const change = useCallback(async (next: boolean) => {
    setBusy(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setBusy(false); return }
    const { error } = await supabase
      .from('usage_preferences')
      .upsert({ user_id: data.user.id, opted_out: next, updated_at: new Date().toISOString() })
    setBusy(false)
    // WHY: en cas d'échec, on ne touche ni l'affichage ni le traceur — la case reste sur son
    // état réel en base plutôt que de mentir à l'utilisateur.
    if (error) return
    setOptedOut(next)
    setUsageOptedOut(next)
  }, [])

  return { optedOut, busy, change }
}
